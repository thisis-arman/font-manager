import { IncomingMessage, ServerResponse } from 'http';

export interface Request extends IncomingMessage {
    body?: any;
    params?: Record<string, string>;
    query?: Record<string, string>;
    files?: Record<string, FileUpload>;
}

export interface Response extends ServerResponse {
    json(data: any): void;
    status(code: number): Response;
    send(data: any): void;
}

export interface FileUpload {
    filename: string;
    mimetype: string;
    size: number;
    data: Buffer;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Route {
    method: HttpMethod;
    path: string;
    handler: (req: Request, res: Response) => Promise<void> | void;
}

export interface Middleware {
    (req: Request, res: Response, next: () => void): void | Promise<void>;
}