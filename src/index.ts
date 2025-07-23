import { App } from './app';
import { config } from './config';
import { setupGlobalErrorHandlers } from './middleware/error-handler';

// Setup global error handlers first
setupGlobalErrorHandlers();

const app = new App();

const startServer = async (): Promise<void> => {
    try {
        console.log('🔄 Starting Font Group Manager Server...');

        await app.listen(config.port, () => {
            const actualPort = app.getPort();
            console.log(`🚀 Font Group Manager Server running on port ${actualPort}`);
            console.log(`📁 Upload directory: ${config.uploadsDir}`);
            console.log(`📝 Visit http://localhost:${actualPort} to use the application`);
            console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    try {
        await app.close();
        console.log('Server closed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
    console.error('🚨 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: any) => {
    console.error('🚨 Unhandled Rejection:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer().catch((error) => {
    console.error('❌ Fatal error during server startup:', error);
    process.exit(1);
});
