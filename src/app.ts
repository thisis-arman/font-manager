import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { Request, Response, Route, HttpMethod } from '@/types';
import { routes } from '@/routes';
import { uploadMiddleware } from '@/middleware/upload';
import { errorHandler } from '@/middleware/error-handler';
import { ResponseHandler } from '@/utils/response.utils';
import { AppError } from '@/utils/error.utils';

interface MiddlewareFunction {
    (req: Request, res: Response, next: (error?: Error) => void): void | Promise<void>;
}

export class App {
    private server: http.Server;
    private routes: Route[];
    private middlewares: MiddlewareFunction[];
    private actualPort: number | null = null;
    private isShuttingDown: boolean = false;

    constructor() {
        this.routes = routes;
        this.middlewares = [errorHandler, uploadMiddleware];
        this.server = http.createServer(this.handleRequest.bind(this));
        this.setupServerEventHandlers();
    }

    private setupServerEventHandlers(): void {
        this.server.on('error', (error) => {
            console.error('Server error:', error);
        });

        this.server.on('clientError', (err, socket) => {
            console.error('Client error:', err);
            if (!socket.destroyed) {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            }
        });
    }

    public use(middleware: MiddlewareFunction): void {
        this.middlewares.push(middleware);
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (this.isShuttingDown) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('Server is shutting down');
            return;
        }

        const request = req as Request;
        const response = this.enhanceResponse(res);
        let responseSent = false;

        const originalEnd = response.end;
        response.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void) {
            if (!responseSent) {
                responseSent = true;
                return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
            }
            return this;
        };

        try {
            req.setTimeout(30000, () => {
                if (!responseSent) {
                    ResponseHandler.error(response, 'Request timeout', 408);
                }
            });

            this.handleCORS(response);

            if (req.method === 'OPTIONS') {
                if (!responseSent) {
                    response.writeHead(204);
                    response.end();
                }
                return;
            }

            const parsedUrl = url.parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '';
            const method = req.method as HttpMethod;

            if (await this.handleStaticFiles(method, pathname, response)) {
                return;
            }

            const middlewareResult = await this.applyMiddleware(request, response);
            if (middlewareResult.shouldReturn || responseSent) {
                return;
            }

            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                await this.parseRequestBody(request);
            }

            await this.handleRouting(request, response, method, pathname, parsedUrl);

        } catch (error) {
            console.error('Request handler error:', {
                error,
                url: req.url,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            if (!responseSent && !response.headersSent) {
                const message = error instanceof AppError ? error.message : 'Internal server error';
                const statusCode = error instanceof AppError ? error.statusCode : 500;
                ResponseHandler.error(response, message, statusCode);
            }
        }
    }

    private async handleStaticFiles(method: HttpMethod, pathname: string, response: Response): Promise<boolean> {
        if (method !== 'GET') return false;

        if (pathname === '/') {
            await this.serveStaticFile(response, 'index.html', 'public');
            return true;
        }

        if (pathname.startsWith('/static/') ||
            pathname.endsWith('.html') ||
            pathname.endsWith('.css') ||
            pathname.endsWith('.js') ||
            pathname.endsWith('.png') ||
            pathname.endsWith('.jpg') ||
            pathname.endsWith('.svg')) {

            const filePath = pathname.startsWith('/static/') ? pathname.substring(8) : pathname.substring(1);
            await this.serveStaticFile(response, filePath, 'static');
            return true;
        }

        return false;
    }

    private async handleRouting(
        request: Request,
        response: Response,
        method: HttpMethod,
        pathname: string,
        parsedUrl: url.UrlWithParsedQuery
    ): Promise<void> {
        const matchedRoute = this.findRoute(method, pathname);
        if (!matchedRoute) {
            ResponseHandler.error(response, 'Route not found', 404);
            return;
        }

        request.params = this.extractParams(matchedRoute.path, pathname);
        request.query = parsedUrl.query as Record<string, string>;

        await matchedRoute.handler(request, response);
    }

    private enhanceResponse(res: http.ServerResponse): Response {
        const response = res as Response;

        response.json = function(data: any): void {
            if (!this.headersSent) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(data));
            }
        };

        response.status = function(code: number): Response {
            if (!this.headersSent) {
                this.statusCode = code;
            }
            return this;
        };

        response.send = function(data: any): void {
            if (this.headersSent) return;

            if (typeof data === 'string') {
                this.setHeader('Content-Type', 'text/plain');
                this.end(data);
            } else if (Buffer.isBuffer(data)) {
                this.setHeader('Content-Type', 'application/octet-stream');
                this.end(data);
            } else {
                this.json(data);
            }
        };

        return response;
    }

    private async applyMiddleware(req: Request, res: Response): Promise<{ shouldReturn: boolean }> {
        return new Promise<{ shouldReturn: boolean }>((resolve) => {
            let middlewareIndex = 0;
            let shouldReturn = false;

            const next = (error?: Error) => {
                if (error) {
                    console.error('Middleware error:', {
                        error,
                        middlewareIndex,
                        url: req.url,
                        timestamp: new Date().toISOString()
                    });
                    if (!res.headersSent) {
                        const message = error instanceof AppError ? error.message : 'Middleware error';
                        const statusCode = error instanceof AppError ? error.statusCode : 500;
                        ResponseHandler.error(res, message, statusCode);
                        shouldReturn = true;
                    }
                    resolve({ shouldReturn: true });
                    return;
                }

                if (middlewareIndex >= this.middlewares.length || res.headersSent) {
                    resolve({ shouldReturn: res.headersSent });
                    return;
                }

                const middleware = this.middlewares[middlewareIndex++];
                try {
                    if (middleware) {
                        const result = middleware(req, res, next);
                        if (result instanceof Promise) {
                            result.catch((err) => next(err));
                        }
                    } else {
                        next();
                    }
                } catch (err) {
                    next(err as Error);
                }
            };

            next();
        });
    }

    private handleCORS(res: Response): void {
        if (!res.headersSent) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Max-Age', '86400');
        }
    }

    private async parseRequestBody(req: Request): Promise<void> {
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            let body = '';
            const maxSize = 10 * 1024 * 1024;
            let currentSize = 0;

            req.on('data', (chunk) => {
                currentSize += chunk.length;
                if (currentSize > maxSize) {
                    reject(new AppError('Request entity too large', 413));
                    return;
                }
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    if (!body.trim()) {
                        req.body = {};
                        resolve();
                        return;
                    }

                    const contentType = req.headers['content-type'] || '';

                    if (contentType.includes('application/json')) {
                        req.body = JSON.parse(body);
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        req.body = Object.fromEntries(new URLSearchParams(body));
                    } else {
                        // Auto-detect JSON
                        if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                            req.body = JSON.parse(body);
                        } else {
                            req.body = body;
                        }
                    }
                } catch (error) {
                    if (req.headers['content-type']?.includes('application/json')) {
                        reject(new AppError('Invalid JSON in request body', 400));
                    } else {
                        req.body = {};
                    }
                }
                resolve();
            });

            req.on('error', (error) => {
                console.error('Request body parsing error:', error);
                req.body = {};
                resolve();
            });
        });
    }

    private findRoute(method: HttpMethod, pathname: string): Route | null {
        return this.routes.find(route =>
            route.method === method && this.matchPath(route.path, pathname)
        ) || null;
    }

    private matchPath(routePath: string, requestPath: string): boolean {
        const routeSegments = routePath.split('/').filter(s => s.length > 0);
        const requestSegments = requestPath.split('/').filter(s => s.length > 0);

        if (routeSegments.length !== requestSegments.length) {
            return false;
        }

        return routeSegments.every((routeSegment, i) => {
            return routeSegment.startsWith(':') || routeSegment === requestSegments[i];
        });
    }

    private extractParams(routePath: string, requestPath: string): Record<string, string> {
        const params: Record<string, string> = {};
        const routeSegments = routePath.split('/').filter(s => s.length > 0);
        const requestSegments = requestPath.split('/').filter(s => s.length > 0);

        routeSegments.forEach((routeSegment, i) => {
            if (routeSegment.startsWith(':')) {
                const paramName = routeSegment.substring(1);
                const requestSegment = requestSegments[i];
                if (requestSegment !== undefined) {
                    params[paramName] = decodeURIComponent(requestSegment);
                }
            }
        });

        return params;
    }

    private async serveStaticFile(res: Response, filePath: string, directory: string = 'static'): Promise<void> {
        return new Promise<void>((resolve) => {
            if (res.headersSent) {
                resolve();
                return;
            }

            const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
            const fullPath = path.join(process.cwd(), directory, safePath);

            const resolvedPath = path.resolve(fullPath);
            const allowedDir = path.resolve(process.cwd(), directory);

            if (!resolvedPath.startsWith(allowedDir)) {
                ResponseHandler.error(res, 'Access denied', 403);
                resolve();
                return;
            }

            fs.readFile(fullPath, (err, data) => {
                if (res.headersSent) {
                    resolve();
                    return;
                }

                if (err) {
                    if (err.code === 'ENOENT') {
                        ResponseHandler.error(res, 'File not found', 404);
                    } else {
                        ResponseHandler.error(res, 'Error reading file', 500);
                    }
                    resolve();
                    return;
                }

                try {
                    const ext = path.extname(fullPath).toLowerCase();
                    const contentType = this.getContentType(ext);
                    const stats = fs.statSync(fullPath);

                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Length', stats.size);
                    res.setHeader('Last-Modified', stats.mtime.toUTCString());
                    res.setHeader('Cache-Control', 'public, max-age=31536000');

                    res.writeHead(200);
                    res.end(data);
                    resolve();
                } catch (error) {
                    console.error('Static file serving error:', error);
                    if (!res.headersSent) {
                        ResponseHandler.error(res, 'Error serving file', 500);
                    }
                    resolve();
                }
            });
        });
    }

    private getContentType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.ttf': 'font/ttf',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.eot': 'application/vnd.ms-fontobject',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    private async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();

            server.listen(port, () => {
                server.once('close', () => resolve(true));
                server.close();
            });

            server.on('error', () => resolve(false));
        });
    }

    private async findAvailablePort(startPort: number, maxAttempts: number = 100): Promise<number> {
        for (let port = startPort; port < startPort + maxAttempts; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }
        throw new AppError(`No available ports found in range ${startPort}-${startPort + maxAttempts}`, 500);
    }

    public async listen(port: number, callback?: () => void): Promise<void> {
        try {
            const availablePort = await this.findAvailablePort(port);
            this.actualPort = availablePort;

            if (availablePort !== port) {
                console.log(`⚠️  Port ${port} is already in use, using port ${availablePort} instead`);
            }

            return new Promise<void>((resolve, reject) => {
                this.server.listen(availablePort, () => {
                    console.log(`🚀 Server listening on port ${availablePort}`);
                    if (callback) {
                        callback();
                    }
                    resolve();
                });

                this.server.on('error', (err) => {
                    reject(new AppError(`Failed to start server: ${err.message}`, 500));
                });
            });

        } catch (error) {
            throw new AppError(`Failed to start server: ${error}`, 500);
        }
    }

    public getPort(): number | null {
        return this.actualPort;
    }

    public async close(): Promise<void> {
        return new Promise((resolve) => {
            this.isShuttingDown = true;
            this.server.close(() => {
                console.log('Server closed successfully');
                resolve();
            });
        });
    }
}
