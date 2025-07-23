import * as crypto from 'crypto';
import {CreateFontGroupDto, IFontGroup, UpdateFontGroupDto} from "@/modules/font-groups";

export class FontGroup implements IFontGroup {
    public readonly id: string;
    public name: string;
    public description?: string;
    public fontIds: string[];
    public fontCount: number;
    public createdDate: Date;
    public updatedDate: Date;
    public tags?: string[];

    constructor(data: CreateFontGroupDto) {
        this.id = crypto.randomUUID();
        this.name = data.name;
        if (data.description !== undefined) this.description = data.description;

        this.fontIds = this.initializeFontIds(data);
        this.fontCount = this.fontIds.length;

        this.createdDate = new Date();
        this.updatedDate = new Date();
        this.tags = data.tags ? [...data.tags] : [];
    }

    private initializeFontIds(data: CreateFontGroupDto): string[] {
        const fontIds: string[] = [];

        if (data.fontIds && data.fontIds.length > 0) {
            fontIds.push(...data.fontIds);
        }

        if (data.fonts && data.fonts.length > 0) {
            const fontsWithIds = data.fonts.filter(font => font.id);
            fontIds.push(...fontsWithIds.map(font => font.id!));
        }

        if (data.mixedFonts) {
            if (data.mixedFonts.existingFontIds && data.mixedFonts.existingFontIds.length > 0) {
                fontIds.push(...data.mixedFonts.existingFontIds);
            }

            if (data.mixedFonts.newFonts && data.mixedFonts.newFonts.length > 0) {
                const newFontsWithIds = data.mixedFonts.newFonts.filter(font => font.id);
                fontIds.push(...newFontsWithIds.map(font => font.id!));
            }
        }

        return fontIds;
    }

    public update(data: UpdateFontGroupDto): void {
        if (data.name !== undefined) this.name = data.name;
        if (data.description !== undefined) this.description = data.description;

        if (this.shouldUpdateFontIds(data)) {
            this.fontIds = this.initializeFontIds(data as CreateFontGroupDto);
            this.fontCount = this.fontIds.length;
        }

        if (data.tags !== undefined) this.tags = data.tags ? [...data.tags] : [];

        this.updatedDate = new Date();
    }

    private shouldUpdateFontIds(data: UpdateFontGroupDto): boolean {
        return (
            data.fontIds !== undefined ||
            data.fonts !== undefined ||
            data.mixedFonts !== undefined
        );
    }

    public addFontIds(fontIds: string[]): void {
        const newFontIds = fontIds.filter(id => !this.fontIds.includes(id));
        this.fontIds.push(...newFontIds);
        this.fontCount = this.fontIds.length;
        this.updatedDate = new Date();
    }

    public removeFontIds(fontIds: string[]): void {
        this.fontIds = this.fontIds.filter(id => !fontIds.includes(id));
        this.fontCount = this.fontIds.length;
        this.updatedDate = new Date();
    }

    public replaceFontIds(fontIds: string[]): void {
        this.fontIds = [...fontIds];
        this.fontCount = this.fontIds.length;
        this.updatedDate = new Date();
    }

    public hasFontId(fontId: string): boolean {
        return this.fontIds.includes(fontId);
    }

    public isEmpty(): boolean {
        return this.fontCount === 0;
    }

    public toJSON(): IFontGroup {
        return {
            id: this.id,
            name: this.name,
            description: this.description || "",
            fontIds: [...this.fontIds],
            fontCount: this.fontCount,
            createdDate: this.createdDate,
            updatedDate: this.updatedDate,
            tags: this.tags ? [...this.tags] : []
        };
    }

    public static fromJSON(data: IFontGroup): FontGroup {
        const fontGroup = Object.create(FontGroup.prototype);
        Object.assign(fontGroup, data);

        if (typeof fontGroup.createdDate === 'string') {
            fontGroup.createdDate = new Date(fontGroup.createdDate);
        }
        if (typeof fontGroup.updatedDate === 'string') {
            fontGroup.updatedDate = new Date(fontGroup.updatedDate);
        }

        return fontGroup;
    }
}
