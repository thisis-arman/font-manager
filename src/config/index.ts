import * as path from 'path';

export interface Config {
    port: number;
    uploadsDir: string;
    maxFileSize: number;
    allowedFileTypes: string[];
}

export const config: Config = {
    port: Number(process.env.PORT) || 9000,
    uploadsDir: path.join(process.cwd(), 'uploads'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['font/ttf', 'application/x-font-ttf', 'application/octet-stream']
};