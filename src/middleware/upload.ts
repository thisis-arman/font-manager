import { Request, Response, Middleware } from '@/types';

interface ParsedFile {
    filename: string;
    mimetype: string;
    size: number;
    data: Buffer;
}

export const uploadMiddleware: Middleware = (req: Request, res: Response, next: () => void): void => {
    if (req.method !== 'POST' || !req.headers['content-type']?.includes('multipart/form-data')) {
        return next();
    }

    const contentType = req.headers['content-type'];
    const boundary = contentType?.split('boundary=')[1];

    if (!boundary) {
        res.statusCode = 400;
        res.end('Missing boundary in content-type header');
        return;
    }

    let body = Buffer.alloc(0);

    req.on('data', (chunk: Buffer) => {
        body = Buffer.concat([body, chunk]);
    });

    req.on('end', () => {
        try {
            const { files, formData } = parseMultipartData(body, boundary);
            req.files = files;
            req.body = formData;
            next();
        } catch (error) {
            res.statusCode = 400;
            res.end('Error parsing file upload');
        }
    });

    req.on('error', (error) => {
        res.statusCode = 500;
        res.end('Internal server error');
    });
};

function parseMultipartData(body: Buffer, boundary: string): {
    files: Record<string, ParsedFile>,
    formData: Record<string, any>
} {
    const files: Record<string, ParsedFile> = {};
    const formData: Record<string, any> = {}; // Add this object
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = splitBuffer(body, boundaryBuffer);

    for (const part of parts) {
        if (part.length === 0) continue;

        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;

        const headerSection = part.slice(0, headerEndIndex).toString();
        const fileData = part.slice(headerEndIndex + 4);

        const cleanFileData = fileData.slice(0, fileData.length - 2);

        const dispositionMatch = headerSection.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
        const typeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);

        if (!dispositionMatch || !dispositionMatch[1]) continue;

        const fieldName: string = dispositionMatch[1];
        const filename: string | undefined = dispositionMatch[2];
        const mimetype: string = typeMatch?.[1]?.trim() || 'application/octet-stream';

        if (filename && cleanFileData.length > 0) {
            files[fieldName] = {
                filename,
                mimetype,
                size: cleanFileData.length,
                data: cleanFileData
            };
        }
        else if (!filename) {
            const fieldValue = cleanFileData.toString('utf8');

            setNestedValue(formData, fieldName, fieldValue);
        }
    }

    return { files, formData };
}

function setNestedValue(obj: any, path: string, value: string): void {
    const keys = path.split(/[\.\[\]]/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!key) continue;
        const nextKey = keys[i + 1];
        if (!current[key]) current[key] = nextKey && /^\d+$/.test(nextKey) ? [] : {};

        current = current[key];
    }

    const finalKey = keys[keys.length - 1];

    if (finalKey) {
        try {
            current[finalKey] = JSON.parse(value);
        } catch {
            current[finalKey] = value;
        }
    }
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    let start = 0;
    let index = 0;

    while ((index = buffer.indexOf(delimiter, start)) !== -1) {
        if (index > start) parts.push(buffer.slice(start, index));
        start = index + delimiter.length;
    }

    if (start < buffer.length) parts.push(buffer.slice(start));

    return parts;
}