import { Request, Response } from '@/types';
import { ResponseHandler } from '@/utils/response.utils';
import * as fs from 'fs';
import * as path from 'path';

export class CoreController {
    /**
     * Home route handler - serves index.html
     */
    public async home(_: Request, res: Response): Promise<void> {
        try {
            const indexPath = path.join(process.cwd(), 'public', 'index.html');

            if (!fs.existsSync(indexPath)) {
                const responseData = {
                    success: true,
                    message: "Welcome to Font Group Management System APIs!",
                    version: "v1",
                    endpoints: {
                        health: "/health",
                        docs: "/api/docs",
                        fonts: {
                            upload: "POST /api/fonts",
                            list: "GET /api/fonts",
                            get: "GET /api/fonts/:id",
                            delete: "DELETE /api/fonts/:id",
                            serve: "GET /uploads/:filename"
                        },
                        fontGroups: {
                            create: "POST /api/font-groups",
                            list: "GET /api/font-groups",
                            get: "GET /api/font-groups/:id",
                            update: "PUT /api/font-groups/:id",
                            delete: "DELETE /api/font-groups/:id"
                        }
                    }
                };
                ResponseHandler.success(res, responseData, "API Documentation");
                return;
            }

            const htmlContent = fs.readFileSync(indexPath, 'utf8');

            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlContent);
            }
        } catch (error) {
            console.error('Home route error:', error);
            ResponseHandler.error(res, 'Internal server error', 500);
        }
    }

    /**
     * Health check route handler
     */
    public async health(_: Request, res: Response): Promise<void> {
        try {
            const healthData = {
                success: true,
                message: 'Font Group Management System is running!',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
                    external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
                    unit: 'MB'
                },
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version
                }
            };

            ResponseHandler.success(res, healthData, "System Health Check");
        } catch (error) {
            console.error('Health check error:', error);
            ResponseHandler.error(res, 'Health check failed', 500);
        }
    }

    /**
     * API Documentation route handler - serves Swagger UI with OpenAPI documentation
     */
    public async docs(_: Request, res: Response): Promise<void> {
        try {
            const openApiPath = path.join(process.cwd(), 'openapi.yaml');

            if (!fs.existsSync(openApiPath)) {
                ResponseHandler.error(res, 'OpenAPI specification file not found', 404);
                return;
            }

            const yamlContent = fs.readFileSync(openApiPath, 'utf8');

            const swaggerHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <meta name="description" content="SwaggerUI" />
                    <title>Font Group Management System - API Documentation</title>
                    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
                    <style>
                        body {
                            margin: 0;
                            background: #fafafa;
                        }
                        .swagger-ui .topbar {
                            background-color: #2c3e50;
                        }
                        .swagger-ui .topbar .download-url-wrapper {
                            display: none;
                        }
                    </style>
                </head>
                <body>
                    <div id="swagger-ui"></div>
                    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js" crossorigin></script>
                    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js" crossorigin></script>
                    <script src="https://unpkg.com/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
                    <script>
                        window.onload = () => {
                            const yamlSpec = \`${yamlContent.replace(/`/g, '\\`')}\`;
                            
                            try {
                                const spec = jsyaml.load(yamlSpec);
                                
                                window.ui = SwaggerUIBundle({
                                    spec: spec,
                                    dom_id: '#swagger-ui',
                                    deepLinking: true,
                                    presets: [
                                        SwaggerUIBundle.presets.apis,
                                        SwaggerUIStandalonePreset
                                    ],
                                    plugins: [
                                        SwaggerUIBundle.plugins.DownloadUrl
                                    ],
                                    layout: "StandaloneLayout",
                                    tryItOutEnabled: true,
                                    requestInterceptor: (request) => {
                                        if (request.url && !request.url.startsWith('http')) {
                                            request.url = window.location.origin + request.url;
                                        }
                                        return request;
                                    }
                                });
                            } catch (error) {
                                console.error('Error parsing OpenAPI spec:', error);
                                document.getElementById('swagger-ui').innerHTML = 
                                    '<div style="padding: 20px; color: red;">Error: Could not parse OpenAPI specification. Please check the YAML syntax.</div>';
                            }
                        };
                    </script>
                </body>
                </html>`;

            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(swaggerHtml);
            }
            return;

        } catch (error) {
            console.error('API docs route error:', error);
            ResponseHandler.error(res, 'Failed to load API documentation', 500);
        }
    }

    public async openApiSpec(req: Request, res: Response): Promise<void> {
        try {
            const openApiPath = path.join(process.cwd(), 'openapi.yaml');

            if (!fs.existsSync(openApiPath)) {
                ResponseHandler.error(res, 'OpenAPI specification file not found', 404);
                return;
            }

            const yamlContent = fs.readFileSync(openApiPath, 'utf8');

            if (!res.headersSent) {
                res.writeHead(200, {
                    'Content-Type': 'application/x-yaml',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(yamlContent);
            }
            return;

        } catch (error) {
            console.error('OpenAPI spec route error:', error);
            ResponseHandler.error(res, 'Failed to load OpenAPI specification', 500);
        }
    }}