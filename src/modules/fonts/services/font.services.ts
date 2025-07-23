import { Font } from '@/modules/fonts/models/Font';
import {
    IFont,
    CreateFontDto,
    FontUpload,
    BulkDeleteFontsDto,
    BulkDeleteResult,
    FontValidation, FontPreview
} from '@/modules/fonts/types/font.types';
import { ValidationError, NotFoundError } from '@/utils/error.utils';
import { config } from '@/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface IFontRepository {
    create(font: Font): Promise<IFont>;
    findAll(): Promise<IFont[]>;
    findById(id: string): Promise<IFont | null>;
    delete(id: string): Promise<boolean>;
}

export interface IFontService {
    uploadFont(fontUpload: FontUpload): Promise<IFont>;
    getAllFonts(): Promise<IFont[]>;
    getFontById(id: string): Promise<IFont>;
    deleteFont(id: string): Promise<void>;
}

class FontRepository implements IFontRepository {
    private fonts: Font[] = [];

    async create(font: Font): Promise<IFont> {
        this.fonts.push(font);
        return font.toJSON();
    }

    async findAll(): Promise<IFont[]> {
        return this.fonts.map(font => font.toJSON());
    }

    async findById(id: string): Promise<IFont | null> {
        const font = this.fonts.find(f => f.id === id);
        return font ? font.toJSON() : null;
    }

    async delete(id: string): Promise<boolean> {
        const index = this.fonts.findIndex(f => f.id === id);
        if (index === -1) return false;

        this.fonts.splice(index, 1);
        return true;
    }
}

export class FontService implements IFontService {
    constructor(private fontRepository: IFontRepository) {}

    async uploadFont(fontUpload: FontUpload): Promise<IFont> {
        this.validateFontFile(fontUpload);
        await this.ensureUploadsDirectory();

        const fileExtension = path.extname(fontUpload.originalName);
        const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
        const filePath = path.join(config.uploadsDir, filename);

        await fs.writeFile(filePath, fontUpload.buffer);

        const validation = await this.validateFontFileContent(fontUpload.buffer);

        const createFontDto: CreateFontDto = {
            filename,
            originalName: fontUpload.originalName,
            path: filePath,
            fontFamily: validation.fontFamily,
            fontStyle: validation.fontStyle,
            isValid: validation.isValid,
            size: fontUpload.size,
            checksum: crypto.createHash('sha256').update(fontUpload.buffer).digest('hex'),
            buffer: fontUpload.buffer,
            mimetype: fontUpload.mimetype
        };

        const font = new Font(createFontDto);
        return await this.fontRepository.create(font);
    }

    async validateFont(fontUpload: FontUpload): Promise<FontValidation> {
        this.validateFontFile(fontUpload);
        return this.validateFontFileContent(fontUpload.buffer);
    }

    async getAllFonts(): Promise<IFont[]> {
        return await this.fontRepository.findAll();
    }

    async getFontById(id: string): Promise<IFont> {
        const font = await this.fontRepository.findById(id);
        if (!font) {
            throw new NotFoundError('Font not found');
        }
        return font;
    }

    async deleteFont(id: string): Promise<void> {
        const font = await this.getFontById(id);

        try {
            await fs.unlink(font.path);
        } catch (error) {
            console.warn(`Could not delete font file: ${font.path}`);
        }

        const deleted = await this.fontRepository.delete(id);
        if (!deleted) {
            throw new NotFoundError('Font not found');
        }
    }

    private validateFontFile(fontUpload: FontUpload): void {
        const fileExtension = path.extname(fontUpload.originalName).toLowerCase();
        if (fileExtension !== '.ttf') {
            throw new ValidationError('Only TTF files are allowed');
        }

        if (fontUpload.size > config.maxFileSize) {
            throw new ValidationError(`File size exceeds maximum limit of ${config.maxFileSize / (1024 * 1024)}MB`);
        }

        if (fontUpload.size === 0) {
            throw new ValidationError('File cannot be empty');
        }
    }

    async getFontPreview(id: string, text: string = 'Example Style', size: number = 24): Promise<FontPreview> {
        const font = await this.getFontById(id);
        return {
            fontFamily: font.fontFamily,
            cssUrl: `/api/fonts/${id}/css`,
            previewUrl: `/api/fonts/${id}/preview-image?text=${encodeURIComponent(text)}&size=${size}`,
            base64Preview: '',
            text,
            fontSize: size
        };
    }

    private async ensureUploadsDirectory(): Promise<void> {
        try {
            await fs.access(config.uploadsDir);
        } catch {
            await fs.mkdir(config.uploadsDir, { recursive: true });
        }
    }

    async bulkDeleteFonts(dto: BulkDeleteFontsDto): Promise<BulkDeleteResult> {
        const result: BulkDeleteResult = {
            deleted: [],
            failed: [],
            summary: {
                total: dto.fontIds.length,
                deleted: 0,
                failed: 0
            }
        };

        for (const id of dto.fontIds) {
            try {
                await this.deleteFont(id);
                result.deleted.push(id);
                result.summary.deleted++;
            } catch (error) {
                result.failed.push({
                    id,
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
                result.summary.failed++;
            }
        }

        return result;
    }

    private async validateFontFileContent(buffer: Buffer): Promise<FontValidation> {
        try {
            return {
                isValid: true,
                fontFamily: 'Example Font',
                fontStyle: 'normal',
                size: buffer.length,
                errors: [],
                warnings: []
            };
        } catch (error) {
            return {
                isValid: false,
                fontFamily: 'Invalid Font',
                fontStyle: 'normal',
                size: buffer.length,
                errors: ['Invalid TTF file format'],
                warnings: []
            };
        }
    }
}

export const fontRepository = new FontRepository();
export const fontService = new FontService(fontRepository);