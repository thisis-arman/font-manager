import { IFont, CreateFontDto } from '@/modules/fonts/types/font.types';
import * as crypto from 'crypto';

export class Font implements IFont {
    public readonly id: string;
    public readonly filename: string;
    public readonly originalName: string;
    public readonly path: string;
    public readonly fontFamily: string;
    public readonly fontStyle: string;
    public readonly isValid: boolean;
    public readonly uploadDate: Date;
    public readonly size: number;
    public readonly checksum: string;
    public readonly mimetype: string;

    constructor(data: CreateFontDto) {
        this.id = crypto.randomUUID();
        this.filename = data.filename;
        this.originalName = data.originalName;
        this.path = data.path;
        this.fontFamily = data.fontFamily || 'Unknown';
        this.fontStyle = data.fontStyle || 'normal';
        this.isValid = data.isValid || false;
        this.uploadDate = new Date();
        this.size = data.size;
        this.checksum = data.checksum || this.generateChecksum(data?.buffer);
        this.mimetype = data.mimetype;
    }

    private generateChecksum(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    public toJSON(): IFont {
        return {
            id: this.id,
            filename: this.filename,
            originalName: this.originalName,
            path: this.path,
            fontFamily: this.fontFamily,
            fontStyle: this.fontStyle,
            isValid: this.isValid,
            uploadDate: this.uploadDate,
            size: this.size,
            checksum: this.checksum,
            mimetype: this.mimetype
        };
    }

    public static fromJSON(data: IFont): Font {
        const font = Object.create(Font.prototype);
        Object.assign(font, data);
        return font;
    }
}