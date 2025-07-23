import { Request, Response } from '@/types';
import { fontGroupService } from '@/modules/font-groups/services/font-group.services';
import { fontService } from '@/modules/fonts/services/font.services'; // Import fontService
import { ResponseHandler } from '@/utils/response.utils';
import { AppError } from '@/utils/error.utils';
import { CreateFontGroupDto } from "@/modules/font-groups";

export interface IFontGroupController {
    createFontGroup(req: Request, res: Response): Promise<void>;
    getAllFontGroups(req: Request, res: Response): Promise<void>;
    getFontGroupById(req: Request, res: Response): Promise<void>;
    updateFontGroup(req: Request, res: Response): Promise<void>;
    deleteFontGroup(req: Request, res: Response): Promise<void>;
    bulkDeleteFontGroups(req: Request, res: Response): Promise<void>;
}

export class FontGroupController implements IFontGroupController {
    private async processAndUploadNewFonts(req: Request): Promise<void> {
        if (!req.files) return;

        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

        if (req.body.mixedFonts?.newFonts && Array.isArray(req.body.mixedFonts.newFonts)) {
            const uploadedFontIds: string[] = [];

            for (let index = 0; index < req.body.mixedFonts.newFonts.length; index++) {
                const font = req.body.mixedFonts.newFonts[index];
                const matchingFile = files.find((file: any) =>
                    file.fieldname === `mixedFonts.newFonts[${index}].file` ||
                    file.originalname === font.originalName
                );

                if (matchingFile) {
                    try {
                        const uploadedFont = await fontService.uploadFont({
                            originalName: matchingFile.originalname,
                            buffer: matchingFile.buffer,
                            size: matchingFile.size,
                            mimetype: matchingFile.mimetype
                        });
                        uploadedFontIds.push(uploadedFont.id);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        throw new AppError(`Failed to upload font ${matchingFile.originalname}: ${errorMessage}`, 400);
                    }
                }
            }

            if (!req.body.mixedFonts.existingFontIds) req.body.mixedFonts.existingFontIds = [];
            req.body.mixedFonts.existingFontIds.push(...uploadedFontIds);

            delete req.body.mixedFonts.newFonts;
        }

        if (req.body.fonts && Array.isArray(req.body.fonts)) {
            const uploadedFontIds: string[] = [];

            for (let index = 0; index < req.body.fonts.length; index++) {
                const font = req.body.fonts[index];
                const matchingFile = files.find((file: any) =>
                    file.fieldname === `fonts[${index}].file` ||
                    file.originalname === font.originalName
                );

                if (matchingFile) {
                    try {
                        const uploadedFont = await fontService.uploadFont({
                            originalName: matchingFile.originalname,
                            buffer: matchingFile.buffer,
                            size: matchingFile.size,
                            mimetype: matchingFile.mimetype
                        });
                        uploadedFontIds.push(uploadedFont.id);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        throw new AppError(`Failed to upload font ${matchingFile.originalname}: ${errorMessage}`, 400);
                    }
                }
            }

            if (!req.body.fontIds) req.body.fontIds = [];

            req.body.fontIds.push(...uploadedFontIds);
            delete req.body.fonts;
        }
    }

    async createFontGroup(req: Request, res: Response): Promise<void> {
        try {
            if (!req.body) throw new AppError('No font group data provided', 400);

            await this.processAndUploadNewFonts(req);
            this.validateCreateRequest(req.body);

            const fontGroup = await fontGroupService.createFontGroup(req.body);

            ResponseHandler.created(res, fontGroup, 'Font group created successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    private validateCreateRequest(body: CreateFontGroupDto): void {
        if (!body.name || body.name.trim().length === 0) {
            throw new AppError('Font group name is required', 400);
        }

        const hasFontIds = body.fontIds && body.fontIds.length > 0;
        const hasFonts = body.fonts && body.fonts.length > 0;
        const hasMixedFonts = body.mixedFonts &&
            ((body.mixedFonts.existingFontIds && body.mixedFonts.existingFontIds.length > 0) ||
                (body.mixedFonts.newFonts && body.mixedFonts.newFonts.length > 0));

        if (!hasFontIds && !hasFonts && !hasMixedFonts) {
            throw new AppError('At least one font input method must be provided', 400);
        }
    }

    async getAllFontGroups(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query?.page as string) || 1;
            const limit = parseInt(req.query?.limit as string) || 20;
            const includeFonts = req.query?.include_fonts === 'true';

            const result = await fontGroupService.getAllFontGroups(page, limit, includeFonts);
            ResponseHandler.success(res, result, 'Font groups retrieved successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async getFontGroupById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font group ID', 400);

            const fontGroup = await fontGroupService.getFontGroupById(id);
            ResponseHandler.success(res, fontGroup, 'Font group retrieved successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async updateFontGroup(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font group ID', 400);

            await this.processAndUploadNewFonts(req);

            const fontGroup = await fontGroupService.updateFontGroup(id, req.body);
            ResponseHandler.success(res, fontGroup, 'Font group updated successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async deleteFontGroup(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params!;
            if (!id) return ResponseHandler.error(res, 'Invalid font group ID', 400);

            await fontGroupService.deleteFontGroup(id);
            ResponseHandler.noContent(res, 'Font group deleted successfully');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }

    async bulkDeleteFontGroups(req: Request, res: Response): Promise<void> {
        try {
            const { fontGroupIds } = req.body!;
            if (!fontGroupIds || !Array.isArray(fontGroupIds)) {
                return ResponseHandler.error(res, 'Invalid font group IDs', 400);
            }

            const result = await fontGroupService.bulkDeleteFontGroups({ fontGroupIds });
            ResponseHandler.success(res, result, 'Bulk delete operation completed');
        } catch (error) {
            if (error instanceof AppError) {
                ResponseHandler.error(res, error.message, error.statusCode);
            } else {
                ResponseHandler.error(res, 'Internal server error', 500);
            }
        }
    }
}

export const fontGroupController = new FontGroupController();