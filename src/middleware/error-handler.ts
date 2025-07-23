import { Request, Response, Middleware } from '@/types';
import { ResponseHandler } from '@/utils/response.utils';
import { AppError } from '@/utils/error.utils';

export interface ErrorWithCode extends Error {
    statusCode?: number;
    code?: string;
}

const handleUnknownError = (error: unknown): { message: string; statusCode: number } => {
    if (error instanceof AppError) {
        return { message: error.message, statusCode: error.statusCode };
    }
    if (error instanceof Error) {
        return { message: error.message, statusCode: 500 };
    }
    if (typeof error === 'string') {
        return { message: error, statusCode: 500 };
    }
    return { message: 'Unknown error occurred', statusCode: 500 };
};

export const setupGlobalErrorHandlers = (): void => {
    process.on('uncaughtException', (error: Error) => {
        console.error('🚨 Uncaught Exception:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        // Graceful shutdown in production
        setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        console.error('🚨 Unhandled Rejection:', {
            reason,
            promise: promise.toString(),
            timestamp: new Date().toISOString()
        });
        // Graceful shutdown in production
        setTimeout(() => process.exit(1), 1000);
    });

    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        process.exit(0);
    });
};

export const errorHandler: Middleware = (req: Request, res: Response, next: () => void): void => {
    const safeNext = () => {
        try {
            next();
        } catch (error) {
            console.error('Synchronous error in middleware chain:', error);
            const { message, statusCode } = handleUnknownError(error);
            if (!res.headersSent) {
                ResponseHandler.error(res, message, statusCode);
            }
        }
    };

    safeNext();
};

export const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            await fn(req, res);
        } catch (error) {
            console.error('Async route handler error:', {
                error,
                url: req.url,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            const { message, statusCode } = handleUnknownError(error);
            if (!res.headersSent) {
                ResponseHandler.error(res, message, statusCode);
            }
        }
    };
};

