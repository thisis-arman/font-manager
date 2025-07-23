import { FontGroup } from '@/modules/font-groups/models/FontGroup';
import { ValidationError, NotFoundError } from '@/utils/error.utils';
import { fontService } from '@/modules/fonts/services/font.services';
import {
    BulkDeleteFontGroupsDto,
    CreateFontGroupDto, CreateFontGroupResponse, FontDataForGroup,
    FontGroupWithFonts,
    IFontGroup,
    PaginatedFontGroups,
    UpdateFontGroupDto
} from "@/modules/font-groups";
import {BulkDeleteResult, FontUpload, IFont} from "@/modules/fonts";

export interface IFontGroupRepository {
    create(fontGroup: FontGroup): Promise<IFontGroup>;
    findAll(): Promise<IFontGroup[]>;
    findById(id: string): Promise<IFontGroup | null>;
    update(id: string, fontGroup: FontGroup): Promise<IFontGroup | null>;
    delete(id: string): Promise<boolean>;
}

class FontGroupRepository implements IFontGroupRepository {
    private fontGroups: FontGroup[] = [];

    async create(fontGroup: FontGroup): Promise<IFontGroup> {
        this.fontGroups.push(fontGroup);
        return fontGroup.toJSON();
    }

    async findAll(): Promise<IFontGroup[]> {
        return this.fontGroups.map(group => group.toJSON());
    }

    async findById(id: string): Promise<IFontGroup | null> {
        const group = this.fontGroups.find(g => g.id === id);
        return group ? group.toJSON() : null;
    }

    async update(id: string, fontGroup: FontGroup): Promise<IFontGroup | null> {
        const index = this.fontGroups.findIndex(g => g.id === id);
        if (index === -1) return null;

        this.fontGroups[index] = fontGroup;
        return fontGroup.toJSON();
    }

    async delete(id: string): Promise<boolean> {
        const index = this.fontGroups.findIndex(g => g.id === id);
        if (index === -1) return false;

        this.fontGroups.splice(index, 1);
        return true;
    }
}

export interface IFontGroupService {
    createFontGroup(createDto: CreateFontGroupDto): Promise<CreateFontGroupResponse>;
    getAllFontGroups(page?: number, limit?: number, includeFonts?: boolean): Promise<PaginatedFontGroups>;
    getFontGroupById(id: string): Promise<FontGroupWithFonts>;
    updateFontGroup(id: string, updateDto: UpdateFontGroupDto): Promise<IFontGroup>;
    deleteFontGroup(id: string): Promise<void>;
    bulkDeleteFontGroups(dto: BulkDeleteFontGroupsDto): Promise<BulkDeleteResult>;
}

export class FontGroupService implements IFontGroupService {
    constructor(private fontGroupRepository: IFontGroupRepository) {}

    async createFontGroup(createDto: CreateFontGroupDto): Promise<CreateFontGroupResponse> {
        this.validateCreateFontGroupDto(createDto);

        let finalFontIds: string[] = [];
        let createdFonts: IFont[] = [];

        if (createDto.fontIds && createDto.fontIds.length > 0) {
            await this.validateFontIds(createDto.fontIds);
            finalFontIds = createDto.fontIds;

        } else if (createDto.fonts && createDto.fonts.length > 0) {
            for (const fontData of createDto.fonts) {
                const createdFont = await this.createFontFromData(fontData);
                createdFonts.push(createdFont);
                finalFontIds.push(createdFont.id);
            }

        } else if (createDto.mixedFonts) {
            if (createDto.mixedFonts.existingFontIds && createDto.mixedFonts.existingFontIds.length > 0) {
                await this.validateFontIds(createDto.mixedFonts.existingFontIds);
                finalFontIds.push(...createDto.mixedFonts.existingFontIds);
            }

            if (createDto.mixedFonts.newFonts && createDto.mixedFonts.newFonts.length > 0) {
                for (const fontData of createDto.mixedFonts.newFonts) {
                    const createdFont = await this.createFontFromData(fontData);
                    createdFonts.push(createdFont);
                    finalFontIds.push(createdFont.id);
                }
            }
        }

        if (finalFontIds.length < 2 || finalFontIds.length > 10) {
            throw new ValidationError('Font group must contain between 2 and 10 fonts');
        }

        const uniqueFontIds = new Set(finalFontIds);
        if (uniqueFontIds.size !== finalFontIds.length) {
            throw new ValidationError('Duplicate font IDs are not allowed');
        }

        console.log("Service: Validation passed, creating FontGroup instance");

        const fontGroupData = {
            ...createDto,
            fontIds: finalFontIds
        };

        const fontGroup = new FontGroup(fontGroupData);
        const result = await this.fontGroupRepository.create(fontGroup);

        const response: CreateFontGroupResponse = {
            ...result,
            ...(createdFonts.length > 0 && {
                createdFonts: createdFonts.map(font => ({
                    id: font.id,
                    filename: font.filename,
                    originalName: font.originalName,
                    fontFamily: font.fontFamily,
                    fontStyle: font.fontStyle
                }))
            })
        };

        return response;
    }

    private async createFontFromData(fontData: FontDataForGroup): Promise<IFont> {
        if (!fontData.filename || !fontData.originalName) {
            throw new ValidationError('Filename and original name are required for font data');
        }

        if (!fontData.fontFamily || !fontData.fontStyle) {
            throw new ValidationError('Font family and style are required for font data');
        }

        if (!fontData.buffer) {
            throw new ValidationError('Font buffer data is required for creating new fonts');
        }

        const fontUpload: FontUpload = {
            filename: fontData.filename,
            originalName: fontData.originalName,
            mimetype: fontData.mimetype,
            size: fontData.size,
            buffer: fontData.buffer
        };

        return await fontService.uploadFont(fontUpload);
    }


    async getAllFontGroups(page: number = 1, limit: number = 20, includeFonts: boolean = false): Promise<PaginatedFontGroups> {
        const allGroups = await this.fontGroupRepository.findAll();

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedGroups = allGroups.slice(startIndex, endIndex);

        let fontGroups: IFontGroup[] | FontGroupWithFonts[];

        if (includeFonts) {
            const allFonts = await fontService.getAllFonts();
            fontGroups = paginatedGroups.map(group => this.enrichWithFonts(group, allFonts));
        } else {
            fontGroups = paginatedGroups;
        }

        return {
            fontGroups,
            pagination: {
                page,
                limit,
                total: allGroups.length,
                totalPages: Math.ceil(allGroups.length / limit),
                hasNext: endIndex < allGroups.length,
                hasPrev: startIndex > 0
            }
        };
    }

    async getFontGroupById(id: string): Promise<FontGroupWithFonts> {
        const fontGroup = await this.fontGroupRepository.findById(id);
        if (!fontGroup) throw new NotFoundError('Font group not found');

        const allFonts = await fontService.getAllFonts();
        return this.enrichWithFonts(fontGroup, allFonts);
    }

    async updateFontGroup(id: string, updateDto: UpdateFontGroupDto): Promise<IFontGroup> {
        const existingGroup = await this.fontGroupRepository.findById(id);
        if (!existingGroup) {
            throw new NotFoundError('Font group not found');
        }

        this.validateUpdateFontGroupDto(updateDto);

        let finalFontIds: string[] | undefined;

        if (updateDto.fontIds) {
            await this.validateFontIds(updateDto.fontIds);
            finalFontIds = updateDto.fontIds;
        } else if (updateDto.fonts) {
            finalFontIds = [];
            for (const fontData of updateDto.fonts) {
                const createdFont = await this.createFontFromData(fontData);
                finalFontIds.push(createdFont.id);
            }
        } else if (updateDto.mixedFonts) {
            finalFontIds = [];

            if (updateDto.mixedFonts.existingFontIds) {
                await this.validateFontIds(updateDto.mixedFonts.existingFontIds);
                finalFontIds.push(...updateDto.mixedFonts.existingFontIds);
            }

            if (updateDto.mixedFonts.newFonts) {
                for (const fontData of updateDto.mixedFonts.newFonts) {
                    const createdFont = await this.createFontFromData(fontData);
                    finalFontIds.push(createdFont.id);
                }
            }
        }

        const fontGroup = FontGroup.fromJSON(existingGroup);
        const updateData = {
            ...updateDto,
            fontIds: finalFontIds ?? []
        };
        fontGroup.update(updateData);

        const updatedGroup = await this.fontGroupRepository.update(id, fontGroup);
        if (!updatedGroup) {
            throw new NotFoundError('Font group not found');
        }

        return updatedGroup;
    }

    async deleteFontGroup(id: string): Promise<void> {
        const deleted = await this.fontGroupRepository.delete(id);
        if (!deleted) {
            throw new NotFoundError('Font group not found');
        }
    }

    async bulkDeleteFontGroups(dto: BulkDeleteFontGroupsDto): Promise<BulkDeleteResult> {
        const result: BulkDeleteResult = {
            deleted: [],
            failed: [],
            summary: {
                total: dto.fontGroupIds.length,
                deleted: 0,
                failed: 0
            }
        };

        for (const id of dto.fontGroupIds) {
            try {
                await this.deleteFontGroup(id);
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

    private enrichWithFonts(group: IFontGroup, allFonts: IFont[]): FontGroupWithFonts {
        const fonts = group.fontIds
            .map(fontId => {
                const font = allFonts.find(f => f.id === fontId);
                return font ? {
                    id: font.id,
                    filename: font.filename,
                    originalName: font.originalName,
                    fontFamily: font.fontFamily,
                    fontStyle: font.fontStyle
                } : null;
            })
            .filter(font => font !== null) as FontGroupWithFonts['fonts'];

        return {
            ...group,
            fonts
        };
    }

    private validateCreateFontGroupDto(dto: CreateFontGroupDto): void {
        if (!dto.name || dto.name.trim().length === 0) {
            throw new ValidationError('Font group name is required');
        }

        if (dto.name.length > 100) {
            throw new ValidationError('Font group name cannot exceed 100 characters');
        }

        if (dto.description && dto.description.length > 500) {
            throw new ValidationError('Description cannot exceed 500 characters');
        }

        const hasFontIds = dto.fontIds && dto.fontIds.length > 0;
        const hasFonts = dto.fonts && dto.fonts.length > 0;
        const hasMixedFonts = dto.mixedFonts &&
            ((dto.mixedFonts.existingFontIds && dto.mixedFonts.existingFontIds.length > 0) ||
                (dto.mixedFonts.newFonts && dto.mixedFonts.newFonts.length > 0));

        if (!hasFontIds && !hasFonts && !hasMixedFonts) {
            throw new ValidationError('At least one font input method must be provided (fontIds, fonts, or mixedFonts)');
        }

        const methodCount = [hasFontIds, hasFonts, hasMixedFonts].filter(Boolean).length;
        if (methodCount > 1) {
            throw new ValidationError('Only one font input method can be used at a time');
        }

        if (dto.tags && dto.tags.length > 10) {
            throw new ValidationError('Cannot have more than 10 tags');
        }

        if (dto.tags && dto.tags.some(tag => tag.length > 50)) {
            throw new ValidationError('Tags cannot exceed 50 characters');
        }

        if (dto.fonts) {
            dto.fonts.forEach((fontData, index) => {
                if (!fontData.filename || !fontData.originalName) {
                    throw new ValidationError(`Font data at index ${index}: filename and originalName are required`);
                }
                if (!fontData.fontFamily || !fontData.fontStyle) {
                    throw new ValidationError(`Font data at index ${index}: fontFamily and fontStyle are required`);
                }
                if (fontData.size <= 0) {
                    throw new ValidationError(`Font data at index ${index}: size must be greater than 0`);
                }
            });
        }

        if (dto.mixedFonts) {
            if (dto.mixedFonts.existingFontIds) {
                const uniqueIds = new Set(dto.mixedFonts.existingFontIds);
                if (uniqueIds.size !== dto.mixedFonts.existingFontIds.length) {
                    throw new ValidationError('Duplicate font IDs in existingFontIds are not allowed');
                }
            }

            if (dto.mixedFonts.newFonts) {
                dto.mixedFonts.newFonts.forEach((fontData, index) => {
                    if (!fontData.filename || !fontData.originalName) {
                        throw new ValidationError(`New font data at index ${index}: filename and originalName are required`);
                    }
                    if (!fontData.fontFamily || !fontData.fontStyle) {
                        throw new ValidationError(`New font data at index ${index}: fontFamily and fontStyle are required`);
                    }
                });
            }
        }
    }

    private validateUpdateFontGroupDto(dto: UpdateFontGroupDto): void {
        if (dto.name !== undefined) {
            if (!dto.name || dto.name.trim().length === 0) {
                throw new ValidationError('Font group name cannot be empty');
            }
            if (dto.name.length > 100) {
                throw new ValidationError('Font group name cannot exceed 100 characters');
            }
        }

        if (dto.description !== undefined && dto.description && dto.description.length > 500) {
            throw new ValidationError('Description cannot exceed 500 characters');
        }

        if (dto.fontIds !== undefined) {
            if (!Array.isArray(dto.fontIds)) {
                throw new ValidationError('Font IDs must be provided as an array');
            }

            if (dto.fontIds.length < 2 || dto.fontIds.length > 10) {
                throw new ValidationError('Font group must contain between 2 and 10 fonts');
            }

            const uniqueFontIds = new Set(dto.fontIds);
            if (uniqueFontIds.size !== dto.fontIds.length) {
                throw new ValidationError('Duplicate font IDs are not allowed');
            }
        }

        if (dto.tags !== undefined) {
            if (dto.tags && dto.tags.length > 10) {
                throw new ValidationError('Cannot have more than 10 tags');
            }
            if (dto.tags && dto.tags.some(tag => tag.length > 50)) {
                throw new ValidationError('Tags cannot exceed 50 characters');
            }
        }

        if (dto.fonts) {
            dto.fonts.forEach((fontData, index) => {
                if (!fontData.filename || !fontData.originalName) {
                    throw new ValidationError(`Font data at index ${index}: filename and originalName are required`);
                }
                if (!fontData.fontFamily || !fontData.fontStyle) {
                    throw new ValidationError(`Font data at index ${index}: fontFamily and fontStyle are required`);
                }
            });
        }

        if (dto.mixedFonts) {
            if (dto.mixedFonts.newFonts) {
                dto.mixedFonts.newFonts.forEach((fontData, index) => {
                    if (!fontData.filename || !fontData.originalName) {
                        throw new ValidationError(`New font data at index ${index}: filename and originalName are required`);
                    }
                    if (!fontData.fontFamily || !fontData.fontStyle) {
                        throw new ValidationError(`New font data at index ${index}: fontFamily and fontStyle are required`);
                    }
                });
            }
        }
    }

    private async validateFontIds(fontIds: string[]): Promise<void> {
        console.log("Validating font IDs:", fontIds);
        for (const fontId of fontIds) {
            try {
                const font = await fontService.getFontById(fontId);
                console.log(`Font ${fontId} found:`, font.filename);
            } catch (error) {
                throw new ValidationError(`Font with ID "${fontId}" does not exist`);
            }
        }
        console.log("All font IDs validated successfully");

    }
}

export const fontGroupRepository = new FontGroupRepository();
export const fontGroupService = new FontGroupService(fontGroupRepository);