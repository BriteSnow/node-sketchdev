import FileFormat from '@sketch-hq/sketch-file-format-ts';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra-plus';
import { readFile } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import * as Path from 'path';
import { isEmpty, prune } from 'utils-min';
import { match, processName, writeToFile } from './utils';
import { TOOL_PATH } from './vals';
import { ZipFile } from './zip-file';


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
	async artboards(opts?: QueryOptions) {
		return sketch_artboards(this.file, opts);
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


	async exportArtboards(opts: ExportArtboardsOptions) {
		return exportFn(this.file, opts);
	}

}



// --------- Mobule Methods --------- //


//#region    ---------- Sketch CLI Wrapper ---------- 
interface SketchListArtboardsResult {
	pages: {
		name: string
		artboards: {
			id: string,
			name: string
		}[]
	}[]
}

async function sketch_artboards(file: string, opts?: QueryOptions): Promise<{ id: string, name: string }[]> {
	// list the artboards and parse the result into a doc
	const cmdArgs = ['--include-symbols=YES', 'list', 'artboards', file];

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

//#endregion ---------- /Sketch CLI Wrapper ---------- 

function isFolderPath(v: string) {
	return v.endsWith(Path.sep) || isEmpty(Path.extname(v));
}


async function exportFn(svgFile: string, _opts: ExportArtboardsOptions) {

	try {
		const isOutDir = isFolderPath(_opts.out);

		const spriteFile = isOutDir ? null : _opts.out;
		const outDir = isOutDir ? _opts.out : Path.dirname(_opts.out);

		const format = _opts.format ?? 'svg';
		// sketch >= 42
		const args = ['--include-symbols=YES',
			`--format=${format}`];
		// ,'--include-namespaces=NO'

		// what take precedence is the opts.items
		const { artboardName, flatten, replace } = _opts;
		let items = _opts.items;

		// if we do not have opts.items and have a opts.artboardName then, we match them.
		if (!items && artboardName) {
			let boards = await sketch_artboards(svgFile, { name: artboardName });
			items = boards.map(b => b.id);
		}

		if (items) {
			args.push('--items=' + items.join(','));
		}

		// if we have a opts.flatten option, the output is opts.out + "_tmp/"
		let sketchExportDir = outDir;
		if (flatten || spriteFile) {
			sketchExportDir = outDir + ".tmp/";
		}
		args.push('--output=' + sketchExportDir);

		// final arguments
		args.push('export', 'artboards', svgFile);

		// perfom the export
		await spawn(TOOL_PATH, args, { toConsole: false });

		// Workaround: Need to skeep a beat to make sure the exported files can be found (putting 1 is too low?)
		// Note: Not sure why we do not see the files immediately, as the above exec should yield when completed. 
		//await wait(1500);

		// if we have the opts.flatten attribute, we need to move the _tmp/**.svg to the opts.out dir
		// and flatten the name
		if (flatten) {
			const svgsGlob = Path.join(sketchExportDir, '/**/*.svg');
			const svgFiles = await fs.glob(svgsGlob);
			const flattenDir = spriteFile ? sketchExportDir : outDir;

			for (svgFile of svgFiles) {
				let name = Path.relative(sketchExportDir, svgFile);

				name = processName(name, { flatten, replace })

				// remove the eventual last .svg
				name = name.replace(/\.svg$/, '');

				let to = Path.join(flattenDir, name + ".svg");

				await fs.copy(svgFile, to);
			}
		}

		if (spriteFile) {
			await processSprite(sketchExportDir, { out: spriteFile });
		}

		// remove te sketchExportDir if it was a temporary one
		if (sketchExportDir !== outDir) {
			await fs.saferRemove(sketchExportDir)
		}
	} catch (ex) {
		console.log("ERROR while exporting\n", ex);
	}
}

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

const cheerioXmlOpts = {
	normalizeWhitespace: true,
	xmlMode: true
};

// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
async function processSprite(svgDir: string, opts: { out: string }) {
	const svgFiles = await fs.glob(`${svgDir}/*.svg`);

	const content = ['<svg xmlns="http://www.w3.org/2000/svg" style="width:0; height:0; visibility:hidden; display:none">'];
	const symbols = [];


	for (let file of svgFiles) {
		let fileContent = await fs.readFile(file, 'utf8');

		let fileInfo = Path.parse(file);

		let symbol: { name: string, viewBox?: string } = {
			name: fileInfo.name
		};


		// get the src svg Doc
		let srcDoc = cheerio.load(fileContent, cheerioXmlOpts);
		let $srcSvg = srcDoc("svg");

		// create the new symbol doc
		let symbolDoc = cheerio.load("<symbol />", cheerioXmlOpts);
		let $symbol = symbolDoc("symbol");

		// set the id from the file name
		$symbol.attr("id", symbol.name);

		// get the same viewBox as the svg source element
		let viewBox = $srcSvg.attr("viewBox");
		if (viewBox) {
			$symbol.attr("viewBox", viewBox);
			symbol.viewBox = viewBox;
		}

		// append the first g element from the src element to the symbol
		let $g = $srcSvg.children("g").clone();
		$symbol.append($g);

		// remove the fill attribute (since chrome has a bug that prevent it to override presentation attribute with css)
		symbolDoc('[fill]').removeAttr("fill");

		content.push(symbolDoc.xml());
		symbols.push(symbol);
	}

	content.push('</svg>');


	const outInfo = Path.parse(opts.out);
	// create the sprite folder
	await fs.mkdirs(outInfo.dir);

	// write the sprite svg
	const contentStr = content.join("\n");
	await writeToFile('svg', opts.out, contentStr);


	// copy the template file
	const fromDemoPath = Path.join(__dirname, "../template-demo.html");
	const toDemoPath = Path.join(outInfo.dir, outInfo.name + "-demo.html");
	const htmlContent = await readFile(fromDemoPath, 'utf-8');
	await writeToFile('demo-html', toDemoPath, htmlContent);
}
// --------- /Mobule Methods --------- //


