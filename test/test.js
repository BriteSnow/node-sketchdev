const fs = require("fs-extra");
const path = require("path");
const sketchdev = require("../index.js");

const dir = __dirname;

var sampleFileNames = ["sample-sketch.sketch"];

var outDir = path.join(dir, "out/");

// just some simple guard on delete
if (outDir.endsWith("test/out/")){
	fs.removeSync(outDir);
	console.log("test cleanup - delete:", outDir);
}

for (let fileName of sampleFileNames){
	let sketchFile = path.join(dir,"samples/", fileName);
	let sketchDoc = sketchdev(sketchFile); 
	
	let sampleOutDir = path.join(outDir, path.basename(fileName, ".sketch"), "/");
	let distSvg = path.join(sampleOutDir, "svg/");
	let distSprite = path.join(sampleOutDir, "sprite/");

	sketchDoc.export({out: distSvg, 
		artboardName: /^ico\/[\w-]*\/\d*$/, // the regex matching artboard that should be exported
		flatten: '-', // if artboards contain '/' it will be stored in the corresponding folder structure, "flatten" just flatten the stucture with a a given char that will replace the '/'
		sprite: distSprite + "sprite.svg" // output all svg as symbols in a sprite.svg and generage a sprite-demo.html page as well
	});
}
