export interface IFont {
    id: string;
    filename: string;
    originalName: string;
    path: string;
    fontFamily: string;
    fontStyle: string;
    isValid: boolean;
    uploadDate: Date;
    size: number;
    checksum: string;
    mimetype: string;
}

export interface CreateFontDto {
    filename: string;
    originalName: string;
    path: string;
    fontFamily: string;
    fontStyle: string;
    isValid: boolean;
    size: number;
    checksum: string;
    mimetype: string;
    buffer: Buffer
}

export interface FontUpload {
    filename?: string;
    originalName: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface FontUploadInput {
    originalName: string;
    buffer: Buffer;
    size: number;
    mimetype: string;
}

export interface FontValidation {
    isValid: boolean;
    fontFamily: string;
    fontStyle: string;
    size: number;
    errors: string[];
    warnings: string[];
}

export interface FontPreview {
    fontFamily: string;
    cssUrl: string;
    previewUrl: string;
    base64Preview: string;
    text: string;
    fontSize: number;
}

export interface BulkDeleteFontsDto {
    fontIds: string[];
    force?: boolean;
}

export interface BulkDeleteResult {
    deleted: string[];
    failed: Array<{ id: string; reason: string }>;
    summary: {
        total: number;
        deleted: number;
        failed: number;
    };
}