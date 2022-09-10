// import * as cheerio from 'cheerio';
import cheerio from 'cheerio';
import { glob, saferRemove } from 'fs-aux';
import { copyFile, mkdir, readFile } from 'fs/promises';
import { spawn } from 'p-spawn';
import * as Path from 'path';
import { isEmpty } from 'utils-min';
import { ExportArtboardsOptions, SketchDoc } from './sketch-doc.js';
import { processName, writeToFile, WriteType } from './utils.js';
import { TOOL_PATH } from './vals.js';

type Root = cheerio.Root;

export async function exportImages(doc: SketchDoc, _opts: ExportArtboardsOptions) {

	try {
		const isOutDir = isFolderPath(_opts.out);

		const spriteFile = isOutDir ? null : _opts.out;
		const outDir = isOutDir ? _opts.out : Path.dirname(_opts.out);

		const format = _opts.format ?? 'svg';
		// sketch >= 42, 
		// , seems to not be supported anymore
		const args = [`--format=${format}`, '--include-symbols=YES'];
		// ,'--include-namespaces=NO'

		// what take precedence is the opts.items
		const { artboardName, flatten, replace } = _opts;
		let items = _opts.items;

		// if we do not have opts.items and have a opts.artboardName then, we match them.
		if (!items && artboardName) {
			let boards = await doc.artboards({ name: artboardName });
			items = boards.map(b => b.id);
		}

		if (items) {
			args.push('--items=' + items.join(','));
		}

		// if we have a opts.flatten option, the output is opts.out + "_tmp/"
		let sketchExportDir = outDir;
		if (flatten || spriteFile) {
			sketchExportDir = Path.join(outDir, "/.tmp/");
		}
		args.push('--output=' + sketchExportDir);

		// final arguments
		args.push('export', 'artboards', doc.file);

		// perfom the export
		await spawn(TOOL_PATH, args, { toConsole: false });

		// Workaround: Need to skip a beat to make sure the exported files can be found (putting 1 is too low?)
		// Note: Not sure why we do not see the files immediately, as the above exec should yield when completed. 
		//await wait(1500);

		// if we have the opts.flatten attribute, we need to move the _tmp/**.svg to the opts.out dir
		// and flatten the name
		if (flatten) {
			const svgsGlob = Path.join(sketchExportDir, '/**/*.svg');
			const svgFiles = await glob(svgsGlob);

			const flattenDir = spriteFile ? sketchExportDir : outDir;

			for (const svgFile of svgFiles) {
				let name = Path.relative(sketchExportDir, svgFile);

				name = processName(name, { flatten, replace })

				// remove the eventual last .svg
				name = name.replace(/\.svg$/, '');

				let to = Path.join(flattenDir, name + ".svg");

				await copyFile(svgFile, to);
			}
		}

		if (spriteFile) {
			await processSprite(sketchExportDir, { out: spriteFile });
		}

		// remove te sketchExportDir if it was a temporary one
		if (sketchExportDir !== outDir) {
			await saferRemove(sketchExportDir);
		}
	} catch (ex) {
		console.log("ERROR while exporting\n", ex);
	}
}


function isFolderPath(v: string) {
	return v.endsWith(Path.sep) || isEmpty(Path.extname(v));
}



// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
async function processSprite(svgDir: string, opts: { out: string }) {
	const svgFiles = await glob(Path.join(svgDir, '/*.svg'));
	const content = ['<svg xmlns="http://www.w3.org/2000/svg">'];
	// const symbols = [];


	for (let file of svgFiles) {
		let fileContent = await readFile(file, 'utf8');

		let fileInfo = Path.parse(file);

		// let symbol: { name: string, viewBox?: string } = {
		// 	name: fileInfo.name
		// };
		const symbolId = fileInfo.name;
		const symbolDoc = symbolFromSvg(fileContent, symbolId);

		content.push(symbolDoc.xml());
		// symbols.push(symbol);
	}

	content.push('</svg>');


	const outInfo = Path.parse(opts.out);
	// create the sprite folder
	await mkdir(outInfo.dir, { recursive: true });

	// write the sprite svg
	let contentStr = content.join("\n");

	if (opts.out.endsWith('ts') || opts.out.endsWith('js')) {
		contentStr = `
// GENERATED BY SKETCHDEV
		
export const SVG_SYMBOLS = \`
${contentStr}
\`;
`
	}
	await writeToFile('svg', opts.out, contentStr);


	// copy the template file
	if (opts.out.endsWith('svg')) {
		await writeDemoFile('demo-html', 'template-demo.html', Path.join(outInfo.dir, outInfo.name + "-demo.html"));
		await writeDemoFile('demo-js', 'template-demo.js', Path.join(outInfo.dir, "sprite-demo.js")); // for now, html hardcode to sprite-..
		await writeDemoFile('demo-css', 'template-demo.css', Path.join(outInfo.dir, "sprite-demo.css")); // for now, html hardcode to sprite-...
	}

}

/** 
 * Rudementary (sketchapp focused) svg doc with defs tags to a valid symbol tag. 
 * Makes quite a bit of assumption on what seems to work with the way sketchapp export svg.
 */
function symbolFromSvg(svgFileContent: string, symbolId: string): Root {
	// get the src svg Doc
	let srcDoc = cheerio.load(svgFileContent, cheerioXmlOpts);
	let $srcSvg = srcDoc("svg");

	// create the new symbol doc
	let symbolDoc = cheerio.load("<symbol />", cheerioXmlOpts);
	let $symbol = symbolDoc("symbol");

	// set the id from the file name
	$symbol.attr("id", symbolId);

	// get the same viewBox as the svg source element
	let viewBox = $srcSvg.attr("viewBox");
	if (viewBox) {
		$symbol.attr("viewBox", viewBox);
		// symbol.viewBox = viewBox;
	}

	// append the first g element from the src element to the symbol
	// note - can have multiple g, will be taken care of by cheerio, like jquery.
	let $g = $srcSvg.children("g").clone();
	$symbol.append($g);

	// should have the same length
	// Assume the clipPaths match 1-1 the g[clip-path], so no need to my by id/url
	let $clipPaths = $srcSvg.find("defs > clipPath");
	let $g_clips = $g.find("[clip-path]");

	for (let i = 0; i < $clipPaths.length; i++) {
		const $clipPath = cheerio($clipPaths.get(i))
		const $g_clip = cheerio($g_clips.get(i));

		$g_clip.empty()
		$g_clip.removeAttr("clip-path");
		$g_clip.append($clipPath.children())
	}

	// console.log("-->> ", $g.length, $clipPaths.length, $g_clips.length, file);

	// remove the fill attribute (since chrome has a bug that prevent it to override presentation attribute with css)
	symbolDoc('[fill]').removeAttr("fill");

	return symbolDoc;
}

async function writeDemoFile(writeType: WriteType, demoFile: string, distFile: string) {
	const __dirname = new URL('.', import.meta.url).pathname;
	// see: https://stackoverflow.com/a/66651120/686724
	const fromDemoPath = Path.join(__dirname, "../" + demoFile);
	const htmlContent = await readFile(fromDemoPath, 'utf-8');
	await writeToFile(writeType, distFile, htmlContent);
}

const cheerioXmlOpts = {
	normalizeWhitespace: true,
	xmlMode: true
};