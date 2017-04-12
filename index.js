'use strict';

const fs = require('fs-extra');
const glob   = require('glob');
const path = require('path');
const run = require('async6').run;
const promisify = require('async6').promisify;
const spawn = require('child_process').spawn;
const cheerio = require('cheerio');

const g = promisify(glob);

module.exports = function(file){
	return new Sketch(file);
};

const tool_path = "/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool";


class Sketch{
	constructor(file){
		this.file = file;
	}

	artboards(opts){
		return run(artboards(this.file, opts));
	}

	export(opts){
		return run(exportFn(this.file, opts));
	}
}

// --------- Mobule Methods --------- //

// List the artboards
// opts.pageName:  (optional) String or regex matching the page.name
// opts.name: (optional) String or regex matching the artboard.name
function* artboards(file, opts){
	// for sketch <= 42
	// var docStr = yield exec(tool_path, ['--include-symbols=YES','--include-namespaces=YES', 'list', 'artboards', file]);

	// list the artboards and parse the result into a doc
	var cmdArgs = ['--include-symbols=YES', 'list', 'artboards', file];

	var docStr = yield exec(tool_path, cmdArgs);
	var doc = JSON.parse(docStr);

	// todo: use opts.pageName to match the pages we want.
	var pages = doc.pages.filter(p => true);

	var artboards = [];
	var matchArtboardName = (opts)?opts.name:null;

	for (let page of pages){
		for (let board of page.artboards){
			// todo: match with opts.pageName

			if (match(matchArtboardName, board.name)){
				artboards.push(board);
			}
		}
	}

	return artboards;
}

// Export artboard files
// opts.out: String representing the output dir
// opts.items: (optional) Array string of item ids (take precedence on opts.artboard)
// opts.artboardName: (optional) String or regex maching the artboard.name
// opts.flatten: (optional) string that describe the separator in case we have artboard in subfolders.
// opts.sprite: (optional) path of the svg sprite (with <symbol> tags of all of the files)
function* exportFn(file, opts){
	
	// sketch <= 42
	var args = ['--include-symbols=YES', 
		'--format=svg',
		'--include-namespaces=NO'];

	// what take precedence is the opts.items
	var items = opts.items;

	// if we do not have opts.items and have a opts.artboardName then, we match them.
	if (!items && opts.artboardName){
		let boards = yield run(artboards(file, {name: opts.artboardName}));
		items = boards.map(b => b.id);
	}
	
	if (items){
		args.push('--items=' + items.join(','));
	}

	// if we have a opts.flatten option, the output is opts.out + "_tmp/"
	var out = opts.out;
	if (opts.flatten){
		out = opts.out + "_tmp/";
	}
	args.push('--output=' + out);

	// final arguments
	args.push('export', 'artboards', file);

	// perfom the export
	var execResult = yield exec(tool_path,args)
				.then(output => ({success: true, output: output}))
				.catch(ex => ({sucess: false, error: ex}));

	// Workaround: Need to skeep a beat to make sure the exported files can be found (putting 1 is too low?)
	// Note: Not sure why we do not see the files immediately, as the above exec should yield when completed. 
	yield wait(500);

	// if we have the opts.flatten attribute, we need to move the _tmp/**.svg to the opts.out dir
	// and flatten the name
	if (opts.flatten){
		var svgFiles = yield g(out + "**/*.svg");

		svgFiles.forEach(file => {
			// replace the folder path by '-'
			var name = file.substring(out.length).replace(/\//gi,opts.flatten);
			// remove the last -dd
			name = name.replace(/-\d.*$/,'');

			var to = path.join(opts.out,name + ".svg");
			fs.copySync(file,to);				
		});
		// move the out (which is ..._tmp/)
		fs.removeSync(out);		
	}

	if (opts.sprite){
		run(sprite(opts.out, {out: opts.sprite}));
	}


	return execResult;
}



var cheerioXmlOpts = {
	normalizeWhitespace: true,
	xmlMode: true
};

// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
function* sprite(svgDir, opts){
	var svgFiles = yield g(svgDir + "*.svg");
	var content = ['<svg xmlns="http://www.w3.org/2000/svg" style="width:0; height:0; visibility:hidden; display:none">'];
	var symbols = [];

	svgFiles.forEach(file => {
		var fileContent = fs.readFileSync(file, 'utf8');
		var fileInfo = path.parse(file);
	
		var symbol = {
			name: fileInfo.name
		};

		// get the src svg Doc
		var srcDoc = cheerio.load(fileContent,cheerioXmlOpts);
		var $srcSvg = srcDoc("svg");

		// create the new symbol doc
		var symbolDoc = cheerio.load("<symbol />",cheerioXmlOpts);
		var $symbol = symbolDoc("symbol");		

		// set the id from the file name
		$symbol.attr("id", symbol.name);

		// get the same viewBox as the svg source element
		var viewBox = $srcSvg.attr("viewBox");
		$symbol.attr("viewBox", viewBox);
		symbol.viewBox = viewBox;
	
		// append the first g element from the src element to the symbol
		var $g = $srcSvg.children("g").clone();
		$symbol.append($g);

		// remove the fill attribute (since chrome has a bug that prevent it to override presentation attribute with css)
		symbolDoc('[fill]').removeAttr( "fill" );

		content.push(symbolDoc.xml());
		symbols.push(symbol);
	});

	content.push('</svg>');

	
	var outInfo = path.parse(opts.out);

	// create the sprite folder
	fs.mkdirsSync(outInfo.dir);

	// write the sprite svg
	var contentStr = content.join("\n");
	console.log('will write sprite to:', opts.out);	
	fs.writeFileSync(opts.out, contentStr);
	
	// write the sprite json	
	var jsonStr = JSON.stringify({symbols: symbols}, null, 2);
	var jsonPath = path.join(outInfo.dir, outInfo.name + ".data");
	fs.writeFileSync(jsonPath, jsonStr);

	// copy the template file
	var fromDemoPath = path.join(__dirname,"template-demo.html");
	var toDemoPath = path.join(outInfo.dir, outInfo.name + "-demo.html");
	fs.copySync(fromDemoPath, toDemoPath);
}
// --------- /Mobule Methods --------- //


// --------- Utilities --------- //
function exec(cmd, args){
	var result = "";

	return new Promise(function(resolve, reject){
		var handle = spawn(cmd, args);

		handle.stdout.on('data', (data) => {
			//console.log(`--- stdout:\n${data}`);
			result += data;
			//result += "\n";
		});

		handle.stderr.on('data', (data) => {
			//console.log(`--- stderr:\n${data}`);
			reject(data);
		});

		handle.on('close', (code) => {
			//console.log(`--- close: child process exited with code ${code}`);
			resolve(result);
		});
	});

}

const STR = "string";
function match(nameOrRgx, value){
	// if no nameOrRgx, then, we match it.
	if (!nameOrRgx){
		return value;
	}
	if (typeof nameOrRgx === STR){
		return (nameOrRgx === value);
	}
	// assume it is a regex
	return value.match(nameOrRgx);
}

function wait(ms){
	return new Promise(function(resolve, reject){
		setTimeout(function(){
			resolve();
		}, ms);
	});
}
// --------- /Utilities --------- //