import { Response, ApiResponse } from '@/types';

export class ResponseHandler {
    static success<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): void {
        if (res.headersSent) {
            console.warn('Attempted to send success response but headers already sent');
            return;
        }

        const response: ApiResponse<T> = {
            success: true,
            message,
            data
        };

        try {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        } catch (error) {
            console.error('Error sending success response:', error);
        }
    }

    static error(res: Response, message: string, statusCode: number = 500, error?: string): void {
        if (res.headersSent) {
            console.warn('Attempted to send error response but headers already sent:', message);
            return;
        }

        const response: ApiResponse = {
            success: false,
            message,
            ...(error !== undefined ? { error } : {})
        };

        try {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        } catch (err) {
            console.error('Error sending error response:', err);
            try {
                if (!res.finished) {
                    res.statusCode = statusCode;
                    res.end(JSON.stringify(response));
                }
            } catch (finalError) {
                console.error('Final attempt to send response failed:', finalError);
            }
        }
    }

    static created<T>(res: Response, data: T, message: string = 'Created successfully'): void {
        this.success(res, data, message, 201);
    }

    static noContent(res: Response, message: string = 'No content'): void {
        if (res.headersSent) return;

        try {
            res.writeHead(204, { 'Content-Type': 'application/json' });
            res.end();
        } catch (error) {
            console.error('Error sending no content response:', error);
        }
    }

    static notFound(res: Response, message: string = 'Resource not found'): void {
        this.error(res, message, 404);
    }

    static badRequest(res: Response, message: string = 'Bad request', error?: string): void {
        this.error(res, message, 400, error);
    }

    static unauthorized(res: Response, message: string = 'Unauthorized'): void {
        this.error(res, message, 401);
    }

    static forbidden(res: Response, message: string = 'Forbidden'): void {
        this.error(res, message, 403);
    }

    static internalError(res: Response, message: string = 'Internal server error', error?: string): void {
        this.error(res, message, 500, error);
    }
}
