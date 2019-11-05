export declare function sketchdev(sketchFile: string): Sketch;
export interface QueryOptions {
    pageName?: string | RegExp;
    name: string | RegExp;
}
export interface ExportOptions {
    format?: 'svg' | 'png' | 'jpeg';
    out: string;
    items?: string[];
    artboardName?: string | RegExp;
    replace?: [RegExp, string];
    flatten?: string;
    sprite?: string;
}
declare class Sketch {
    file: string;
    constructor(file: string);
    artboards(opts: QueryOptions): Promise<{
        id: string;
    }[]>;
    export(opts: ExportOptions): Promise<void>;
    exportIcons(distDir: string, opts?: ExportOptions): Promise<void>;
}
export {};
