const fs = require("fs-extra-plus");
const path = require("path");
const { spawn } = require("p-spawn");
const cheerio = require("cheerio");


module.exports = { sketchdev };

const tool_path = "/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool";

function sketchdev(sketchFile) {
	return new Sketch(sketchFile);
}

class Sketch {
	constructor(file) {
		this.file = file;
	}

	async artboards(opts) {
		return artboards(this.file, opts);
	}

	async export(opts) {
		return exportFn(this.file, opts);
	}

	async exportIcons(distDir, opts) {
		await fs.mkdirs(distDir);

		// build the defaultOpts
		var svgDir = path.join(distDir, "svg/");
		var spritePath = path.join(distDir, "sprite/sprite.svg");

		var defaultOpts = {
			out: svgDir,
			artboardName: /^ico\/[\w-]*\/\d*$/, // the regex matching artboard that should be exported
			flatten: '-',
			sprite: spritePath
		};

		opts = (opts) ? Object.assign({}, defaultOpts, opts) : defaultOpts;



		return this.export(opts);
	}
}


// --------- Mobule Methods --------- //

async function artboards(file, opts) {
	// for sketch <= 42
	// var docStr = yield exec(tool_path, ['--include-symbols=YES','--include-namespaces=YES', 'list', 'artboards', file]);

	// list the artboards and parse the result into a doc
	var cmdArgs = ['--include-symbols=YES', 'list', 'artboards', file];

	var r = await spawn(tool_path, cmdArgs, { capture: "stdout" });
	var docStr = r.stdout;

	var doc = JSON.parse(docStr);

	// todo: use opts.pageName to match the pages we want.
	var pages = doc.pages.filter(p => true);

	var artboards = [];
	var matchArtboardName = (opts) ? opts.name : null;

	for (let page of pages) {
		for (let board of page.artboards) {
			// todo: match with opts.pageName

			if (match(matchArtboardName, board.name)) {
				artboards.push(board);
			}
		}
	}

	return artboards;
}

async function exportFn(file, opts) {

	try {
		// sketch >= 42
		var args = ['--include-symbols=YES',
			'--format=svg'];
		// ,'--include-namespaces=NO'

		// what take precedence is the opts.items
		var items = opts.items;

		// if we do not have opts.items and have a opts.artboardName then, we match them.
		if (!items && opts.artboardName) {
			let boards = await artboards(file, { name: opts.artboardName });
			items = boards.map(b => b.id);
		}

		if (items) {
			args.push('--items=' + items.join(','));
		}

		// if we have a opts.flatten option, the output is opts.out + "_tmp/"
		var out = opts.out;
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
			var svgFiles = await fs.listFiles(out, { suffix: ".svg" });

			for (file of svgFiles) {
				// replace the folder path by '-'
				let name = file.substring(out.length).replace(/\//gi, opts.flatten);
				// remove the last -dd
				name = name.replace(/-\d.*$/, '');
				// remove the ventual last .svg
				name = name.replace(/\.svg$/, '');

				let to = path.join(opts.out, name + ".svg");
				await fs.copy(file, to);
			}

			//remove the out (which is ..._tmp/)
			await fs.remove(out);

		}

		if (opts.sprite) {
			await sprite(opts.out, { out: opts.sprite });
		}
	} catch (ex) {
		console.log("ERROR while exporting\n", ex);
	}
}



var cheerioXmlOpts = {
	normalizeWhitespace: true,
	xmlMode: true
};

// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
async function sprite(svgDir, opts) {
	var svgFiles = await fs.listFiles(svgDir, { suffix: ".svg" });

	var content = ['<svg xmlns="http://www.w3.org/2000/svg" style="width:0; height:0; visibility:hidden; display:none">'];
	var symbols = [];


	for (let file of svgFiles) {
		let fileContent = await fs.readFile(file, 'utf8');

		let fileInfo = path.parse(file);

		let symbol = {
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
		$symbol.attr("viewBox", viewBox);
		symbol.viewBox = viewBox;

		// append the first g element from the src element to the symbol
		let $g = $srcSvg.children("g").clone();
		$symbol.append($g);

		// remove the fill attribute (since chrome has a bug that prevent it to override presentation attribute with css)
		symbolDoc('[fill]').removeAttr("fill");

		content.push(symbolDoc.xml());
		symbols.push(symbol);
	}

	content.push('</svg>');


	var outInfo = path.parse(opts.out);
	// create the sprite folder
	await fs.mkdirs(outInfo.dir);

	// write the sprite svg
	var contentStr = content.join("\n");
	console.log('will write sprite to:', opts.out);
	await fs.writeFile(opts.out, contentStr);

	// copy the template file
	var fromDemoPath = path.join(__dirname, "template-demo.html");
	var toDemoPath = path.join(outInfo.dir, outInfo.name + "-demo.html");
	await fs.copy(fromDemoPath, toDemoPath);
}
// --------- /Mobule Methods --------- //


// --------- Utilities --------- //
const STR = "string";
function match(nameOrRgx, value) {
	// if no nameOrRgx, then, we match it.
	if (!nameOrRgx) {
		return value;
	}
	if (typeof nameOrRgx === STR) {
		return (nameOrRgx === value);
	}
	// assume it is a regex
	return value.match(nameOrRgx);
}

function wait(ms) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, ms);
	});
}
// --------- /Utilities --------- //