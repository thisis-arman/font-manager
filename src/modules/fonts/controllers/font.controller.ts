import { Request, Response } from '@/types';
import { fontService } from '@/modules/fonts/services/font.services';
import { ResponseHandler } from '@/utils/response.utils';
import { AppError } from '@/utils/error.utils';
import * as fs from 'fs';

export interface IFontController {
    uploadFont(req: Request, res: Response): Promise<void>;
    validateFont(req: Request, res: Response): Promise<void>;
    getAllFonts(req: Request, res: Response): Promise<void>;
    getFontById(req: Request, res: Response): Promise<void>;
    deleteFont(req: Request, res: Response): Promise<void>;
    bulkDeleteFonts(req: Request, res: Response): Promise<void>;
    getFontPreview(req: Request, res: Response): Promise<void>;
    serveFont(req: Request, res: Response): Promise<void>;
}

export class FontController implements IFontController {
    async uploadFont(req: Request, res: Response): Promise<void> {
        try {
            if (!req.files?.font) throw new AppError('No font file uploaded', 400);

            const fontFile = req.files.font;
            const fontUpload = {
                filename: fontFile.filename,
                originalName: fontFile.filename,
                mimetype: fontFile.mimetype,
                size: fontFile.size,
                buffer: fontFile.data
            };

            const font = await fontService.uploadFont(fontUpload);
            ResponseHandler.created(res, font, 'Font uploaded successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async validateFont(req: Request, res: Response): Promise<void> {
        try {
            if (!req.files?.font) throw new AppError('No font file uploaded', 400);

            const fontFile = req.files.font;
            const fontUpload = {
                filename: fontFile.filename,
                originalName: fontFile.filename,
                mimetype: fontFile.mimetype,
                size: fontFile.size,
                buffer: fontFile.data
            };

            const validation = await fontService.validateFont(fontUpload);
            ResponseHandler.success(res, validation, 'Font validated successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async getAllFonts(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query?.page as string) || 1;
            const limit = parseInt(req.query?.limit as string) || 20;

            const allFonts = await fontService.getAllFonts();

            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const fonts = allFonts.slice(startIndex, endIndex);

            const paginatedResponse = {
                fonts,
                pagination: {
                    page,
                    limit,
                    total: allFonts.length,
                    totalPages: Math.ceil(allFonts.length / limit),
                    hasNext: endIndex < allFonts.length,
                    hasPrev: startIndex > 0
                }
            };

            ResponseHandler.success(res, paginatedResponse, 'Fonts retrieved successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async getFontById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font ID', 400);
            const font = await fontService.getFontById(id);
            ResponseHandler.success(res, font, 'Font retrieved successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async deleteFont(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font ID', 400);
            await fontService.deleteFont(id);
            ResponseHandler.success(res, {id},'Font deleted successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async bulkDeleteFonts(req: Request, res: Response): Promise<void> {
        try {
            const { fontIds, force } = req.body!;
            if (!fontIds || !Array.isArray(fontIds)) {
                return ResponseHandler.error(res, 'Invalid font IDs', 400);
            }

            const result = await fontService.bulkDeleteFonts({ fontIds, force });
            ResponseHandler.success(res, result, 'Bulk delete operation completed');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async getFontPreview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font ID', 400);

            const text = req.query?.text as string || 'Example Style';
            const size = parseInt(req.query?.size as string) || 24;

            const preview = await fontService.getFontPreview(id, text, size);
            ResponseHandler.success(res, preview, 'Font preview generated successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async serveFont(req: Request, res: Response): Promise<void> {
        try {
            const { filename } = req.params!;
            const font = (await fontService.getAllFonts()).find(f => f.filename === filename);

            if (!font) throw new AppError('Font file not found', 404);
            if (!fs.existsSync(font.path)) throw new AppError('Font file not found on disk', 404);

            res.writeHead(200, {
                'Content-Type': font.mimetype,
                'Content-Disposition': `inline; filename="${font.originalName}"`,
                'Cache-Control': 'public, max-age=31536000'
            });

            const fileStream = fs.createReadStream(font.path);
            fileStream.pipe(res);
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }
}

export const fontController = new FontController();