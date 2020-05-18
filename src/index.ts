import FileFormat from '@sketch-hq/sketch-file-format-ts';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import * as Path from 'path';
import { prune } from 'utils-min';
import { ZipFile } from './zip-file';

// Sketch Doc: https://developer.sketch.com/cli/

const tool_path = "/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool";

export function sketchdev(sketchFile: string) {
	return new Sketch(sketchFile);
}


class Sketch {
	file: string;
	zipFile: ZipFile;

	constructor(file: string) {
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


	async exportArtboards(opts: ExportArtboardsOptions) {
		return exportFn(this.file, opts);
	}

	async exportIcons(distDir: string, opts?: ExportArtboardsOptions) {
		await fs.mkdirs(distDir);

		// build the defaultOpts
		const svgDir = Path.join(distDir, "svg/");
		const spritePath = Path.join(distDir, "sprite/sprite.svg");
		const defaultOpts = {
			out: svgDir,
			artboardName: /^ico\/.*/, // the regex matching artboard that should be exported
			flatten: '-',
			sprite: spritePath
		};

		opts = (opts) ? Object.assign({}, defaultOpts, opts) : defaultOpts;


		return this.exportArtboards(opts);
	}

	async exportStyles(opts: ExportStylesOptions) {
		const styles = await this.styles();
		const refMode = (opts.ref != null) ? true : false;
		const groupLevel = opts.group;

		type CssVar = { name: string, hex: string, rgba: string, isRef: boolean, group?: string };

		//// build the css vars
		let cssRefVars: (CssVar & { isRef: true })[] = [];
		let cssOtherVars: (CssVar & { isRef: false })[] = [];

		for (const style of styles) {
			if (match(opts.styleName, style.name) && style.fill != null) {
				let group: string | undefined;
				if (groupLevel != null) {
					group = style.name.split('/').slice(0, groupLevel).join('/');
					// apply same processing as name
					group = processName(group, opts);
				}
				const name = processName(style.name, opts);
				const { rgba, hex } = webColor(style.fill);
				if (refMode && match(opts.ref!, style.name)) {
					cssRefVars.push({ name, hex, rgba, isRef: true, group });
				} else {
					cssOtherVars.push({ name, hex, rgba, isRef: false, group });
				}
			}
		}

		cssRefVars = cssRefVars.sort((a, b) => a.name.localeCompare(b.name));
		cssOtherVars = cssOtherVars.sort((a, b) => a.name.localeCompare(b.name));

		//// build cssString
		const cssScope = opts?.cssScope ?? 'root';
		let css = `:${cssScope}{\n`;

		const refVarByRgba: { [rgba: string]: { name: string, hex: string, rgba: string } } = {};
		let previousGroup: string | undefined;

		for (const cssVar of cssRefVars) {
			// add group if needed
			const group = cssVar.group
			if (group) {
				if (group !== previousGroup) {
					css += `\n  /* ${group} */\n`
					previousGroup = group;
				}
			}

			css += `\t--${cssVar.name}: ${cssVar.hex}; \n`;
			refVarByRgba[cssVar.rgba] = cssVar;
		}

		// Do not split if we already have groups
		if (!previousGroup && cssRefVars.length > 0) {
			css += '\n';
		}

		for (const cssVar of cssOtherVars) {
			// add group if needed
			const group = cssVar.group
			if (group) {
				if (group !== previousGroup) {
					css += `\n  /* ${group} */\n`
					previousGroup = group;
				}
			}

			const refVar = refVarByRgba[cssVar.rgba];
			if (refVar) {
				css += `\t--${cssVar.name}: var(--${refVar.name}); /* ${cssVar.hex} */\n`;
			} else {
				css += `\t--${cssVar.name}: ${cssVar.hex};\n`;
			}

		}

		css += '}\n';
		//// write
		await fs.writeFile(opts.outFile, css);

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

	const r = await spawn(tool_path, cmdArgs, { capture: "stdout" });
	const docStr = r.stdout;

	const doc = JSON.parse(docStr) as SketchListArtboardsResult;

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




async function exportFn(file: string, opts: ExportArtboardsOptions) {

	try {
		const format = opts.format ?? 'svg';
		// sketch >= 42
		const args = ['--include-symbols=YES',
			`--format=${format}`];
		// ,'--include-namespaces=NO'

		// what take precedence is the opts.items
		let items = opts.items;

		// if we do not have opts.items and have a opts.artboardName then, we match them.
		if (!items && opts.artboardName) {
			let boards = await sketch_artboards(file, { name: opts.artboardName });
			items = boards.map(b => b.id);
		}

		if (items) {
			args.push('--items=' + items.join(','));
		}

		// if we have a opts.flatten option, the output is opts.out + "_tmp/"
		let out = opts.out;
		if (opts.flatten) {
			out = opts.out + "_tmp/";
		}
		args.push('--output=' + out);

		// final arguments
		args.push('export', 'artboards', file);

		// perfom the export
		await spawn(tool_path, args, { toConsole: false });

		// Workaround: Need to skeep a beat to make sure the exported files can be found (putting 1 is too low?)
		// Note: Not sure why we do not see the files immediately, as the above exec should yield when completed. 
		//await wait(1500);

		// if we have the opts.flatten attribute, we need to move the _tmp/**.svg to the opts.out dir
		// and flatten the name
		if (opts.flatten) {
			let svgsGlob = Path.join(out, '/**/*.svg');
			let svgFiles = await fs.glob(svgsGlob);

			for (file of svgFiles) {
				let name = Path.relative(out, file);

				name = processName(name, opts)

				// remove the eventual last .svg
				name = name.replace(/\.svg$/, '');

				let to = Path.join(opts.out, name + ".svg");
				await fs.copy(file, to);
			}

			//remove the out (which is ..._tmp/)
			await fs.saferRemove(out);

		}

		if (opts.sprite) {
			await sprite(opts.out, { out: opts.sprite });
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

export interface ExportStylesOptions {
	outFile: string; // the css file

	styleName?: string | RegExp; // (default none) matching style name (startsWith if string, or regex) 

	ref?: (string | RegExp)[]; // reference styles, which will be used as var if other match to it. Base on styleName matching rules

	group?: number; // If needs to group the css output (level of /, starting at 1 e.g. 2 fill/prime/500, will have the group 'fill/prime/')

	cssScope?: string; // default 'root' which put the var in the ':root{...}' but can be another name or selecctor

	replace?: [RegExp, string]; // transformation on the name
	// string that describe the separator in case we have artboard in subfolders.
	flatten?: string | null;



}


export interface ExportArtboardsOptions {
	format?: 'svg' | 'png' | 'jpeg';

	// String representing the output dir
	out: string;

	// Array string of item ids (take precedence on opts.artboardName)
	items?: string[];

	// String or regex maching the artboard.name
	artboardName?: string | RegExp;

	// Replace the file name characters base on regex (i.e. remove last /number)
	replace?: [RegExp, string];

	// string that describe the separator in case we have artboard in subfolders.
	flatten?: string;
	// path of the svg sprite(with <symbol>tags of all of the files)
	sprite?: string;
}


//#endregion ---------- /Options Types ---------- 

//#region    ---------- Entities ---------- 
export interface Style {
	name: string;
	fill?: [number, number, number, number]; // r,g,b,a
	stroke?: [number, number, number, number]; // r,g,b,a
}
//#endregion ---------- /Entities ---------- 

const cheerioXmlOpts = {
	normalizeWhitespace: true,
	xmlMode: true
};

// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
async function sprite(svgDir: string, opts: { out: string }) {
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
	console.log('will write sprite to:', opts.out);
	await fs.writeFile(opts.out, contentStr);

	// copy the template file
	const fromDemoPath = Path.join(__dirname, "../template-demo.html");
	const toDemoPath = Path.join(outInfo.dir, outInfo.name + "-demo.html");
	await fs.copy(fromDemoPath, toDemoPath);
}
// --------- /Mobule Methods --------- //


// --------- Utilities --------- //

/** Process a name given the otpional replace and flatten rules */
function processName(name: string, opts?: { flatten?: string | null, replace?: [RegExp, string] }) {

	// first the RegEx
	if (opts?.replace) {
		name = name.replace(opts.replace[0], opts.replace[1]);
	}

	// then flatten (if undefined, still default, but if null, then, no flatten)
	if (opts?.flatten || opts?.flatten === undefined) {
		const delim = opts?.flatten ?? '-';
		name = flatten(name, delim);
	}

	return name;
}

type MatchRule = (string | RegExp);

function match(nameOrRgx: MatchRule | MatchRule[] | undefined | null, value: string): boolean {
	// if no nameOrRgx, then, we match it.
	if (nameOrRgx == null) return true;

	const rules = Array.isArray(nameOrRgx) ? nameOrRgx : [nameOrRgx];

	for (const rule of rules) {

		// succeed on first match
		if (typeof rule === 'string' && value.startsWith(rule)) {
			return true;
		} else if (value.match(rule)) {
			return true;
		}
	}

	return false;

}

function flatten(value: string, delim: string) {
	return value.replace(/\//gi, delim);
}

function webColor(vals: [number, number, number, number]): { rgba: string, hex: string } {
	const [rNum, gNum, bNum, a] = vals; // this is the 0 to 1 values
	const [r, g, b] = [Math.round(rNum * 255), Math.round(gNum * 255), Math.round(bNum * 255)];
	const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
	const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	return { rgba, hex };
}

function toHex(num: number): string {
	return num.toString(16).toUpperCase().padStart(2, '0');
}

function wait(ms: number) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, ms);
	});
}




// --------- /Utilities --------- //

