
export function sketchdev(file: string): Sketch;

export interface QueryOptions {
	/* string or regex matching the page.name */
	pageName?: string | RegExp;
	/* String or regex matching the artboard.name */
	name: string | RegExp;
}

export interface ExportOptions {
	// String representing the output dir
	out: string;
	// Array string of item ids (take precedence on opts.artboardName)
	items?: string[];
	// String or regex maching the artboard.name
	artboardName?: string | RegExp;
	// string that describe the separator in case we have artboard in subfolders.
	flatten?: string;
	// path of the svg sprite(with <symbol>tags of all of the files)
	sprite?: string;
}

export class Sketch {
	constructor(file: string);
	artboards(opts?: QueryOptions): Any;
	export(opts: ExportOptions): void;
	exportIcons(distDir: string, opts?: ExportOptions): void;
}