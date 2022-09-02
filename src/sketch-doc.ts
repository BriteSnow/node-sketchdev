import FileFormat from '@sketch-hq/sketch-file-format-ts';
import { spawn } from 'p-spawn';
import { prune } from 'utils-min';
import { match } from './utils.js';
import { TOOL_PATH } from './vals.js';
import { ZipFile } from './zip-file.js';

// Sketch Doc: https://developer.sketch.com/cli/

const constructGuard = Symbol();


/** fator a new SketchDoc file */
export function sketchDoc(sketchFile: string) {
	return new SketchDoc(sketchFile, constructGuard);
}


export class SketchDoc {
	file: string;
	zipFile: ZipFile;

	constructor(file: string, guard: Symbol) {
		if (guard !== constructGuard) {
			throw new Error('Cannot build a SketchDoc direction. Use sketchDoc() factory funciton');
		}
		this.file = file;
		this.zipFile = new ZipFile(file);
	}

	/** Return the list of artboards matching the query options */
	async artboards(opts?: QueryOptions): Promise<{ id: string, name: string }[]> {
		// list the artboards and parse the result into a doc
		const cmdArgs = ['--include-symbols=YES', 'list', 'artboards', this.file];

		const r = await spawn(TOOL_PATH, cmdArgs, { capture: "stdout" });
		const docStr = r.stdout;

		const doc = JSON.parse(docStr!) as SketchListArtboardsResult;

		// todo: use opts.pageName to match the pages we want.
		const pages = doc.pages.filter(p => true);

		const artboards = [];
		const matchArtboardName = (opts) ? opts.name : null;

		for (const page of pages) {
			for (const board of page.artboards) {
				// todo: match with opts.pageName
				if (match(matchArtboardName, board.name)) {
					artboards.push(board);
				}
			}
		}

		return artboards;
	}

	/** Return the document shared styles */
	async styles() {
		const result: Style[] = [];

		const document = await this.zipFile.loadJson('document.json') as FileFormat.Document;

		const rawStyles = document.layerStyles?.objects;
		if (rawStyles) {
			for (const rawStyle of rawStyles) {
				const name = rawStyle.name;
				let fill: Style['fill'];
				let stroke: Style['stroke'];

				const rawFirstFill = rawStyle.value.fills?.[0];
				if (rawFirstFill) {
					const { red, green, blue, alpha } = rawFirstFill.color;
					fill = [red, green, blue, alpha];
				}

				const rawFirstBorder = rawStyle.value.borders?.[0];
				if (rawFirstBorder) {
					const { red, blue, green, alpha } = rawFirstBorder.color;
					stroke = [red, blue, green, alpha];
				}

				result.push(prune({ name, fill, stroke }));
			}
		}
		return result;
	}


	async colors() {
		const result: Color[] = [];

		const document = await this.zipFile.loadJson('document.json') as FileFormat.Document;

		const rawSwatches = document.sharedSwatches?.objects;
		if (rawSwatches) {
			for (const swatch of rawSwatches) {
				const { name, value } = swatch;
				const { red, green, blue, alpha } = value;

				result.push({
					name,
					value: [red, green, blue, alpha]
				});
			}
		}
		return result;
	}


	// async exportArtboards(opts: ExportArtboardsOptions) {
	// 	return exportFn(this.file, opts);
	// }

}



// --------- Mobule Methods --------- //


// #region    ---------- Sketch CLI Wrapper ---------- 
export interface SketchListArtboardsResult {
	pages: {
		name: string
		artboards: {
			id: string,
			name: string
		}[]
	}[]
}

// #endregion ---------- /Sketch CLI Wrapper ---------- 



//#region    ---------- Options Types ---------- 

export interface QueryOptions {
	/* string or regex matching the page.name */
	pageName?: string | RegExp;
	/* String or regex matching the artboard.name */
	name: string | RegExp;
}




export interface ExportArtboardsOptions {
	format?: 'svg' | 'png' | 'jpeg';

	// dir or file (if file, will do the svg sprite)
	out: string;

	// Array string of item ids (take precedence on opts.artboardName)
	items?: string[];

	// String or regex maching the artboard.name
	artboardName?: string | RegExp;

	// Replace the file name characters base on regex (i.e. remove last /number)
	replace?: [RegExp, string];

	// string that describe the separator in case we have artboard in subfolders.
	flatten?: string;

}


//#endregion ---------- /Options Types ---------- 

//#region    ---------- Entities ---------- 
export interface Style {
	name: string;
	fill?: [number, number, number, number]; // r,g,b,a
	stroke?: [number, number, number, number]; // r,g,b,a
}

export interface Color {
	name: string;
	value: [number, number, number, number]; // r,g,b,a
}
//#endregion ---------- /Entities ---------- 




