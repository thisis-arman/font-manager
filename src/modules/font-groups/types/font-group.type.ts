export interface IFontGroup {
    id: string;
    name: string;
    description?: string;
    fontIds: string[];
    fontCount: number;
    createdDate: Date;
    updatedDate: Date;
    tags?: string[];
}

export interface FontDataForGroup {
    id?: string;
    filename: string;
    originalName: string;
    fontFamily: string;
    fontStyle: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
}

export interface CreateFontGroupDto {
    name: string;
    description?: string;
    fontIds?: string[];
    fonts?: FontDataForGroup[];
    mixedFonts?: {
        existingFontIds?: string[];
        newFonts?: FontDataForGroup[];
    };
    tags?: string[];
}

export interface UpdateFontGroupDto {
    name?: string;
    description?: string;
    fontIds?: string[];
    fonts?: FontDataForGroup[];
    mixedFonts?: {
        existingFontIds?: string[];
        newFonts?: FontDataForGroup[];
    };
    tags?: string[];
}

export interface FontGroupWithFonts extends IFontGroup {
    fonts: Array<{
        id: string;
        filename: string;
        originalName: string;
        fontFamily: string;
        fontStyle: string;
    }>;
}

export interface BulkDeleteFontGroupsDto {
    fontGroupIds: string[];
}

export interface PaginatedFontGroups {
    fontGroups: IFontGroup[] | FontGroupWithFonts[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface CreateFontGroupResponse extends IFontGroup {
    createdFonts?: Array<{
        id: string;
        filename: string;
        originalName: string;
        fontFamily: string;
        fontStyle: string;
    }>;
}
