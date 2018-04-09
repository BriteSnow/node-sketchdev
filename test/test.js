const fs = require("fs-extra-plus");
const path = require("path");
const { sketchdev } = require("../index.js");

const dir = __dirname;

var sampleFileNames = ["sample-sketch.sketch"];

var outDir = path.join(dir, "out/");


performTest();

async function performTest() {
	try {
		// just some simple guard on delete
		if (outDir.endsWith("test/out/")) {
			await fs.remove(outDir);
			console.log("test cleanup - delete:", outDir);
		}

		for (let fileName of sampleFileNames) {
			let sketchFile = path.join(dir, "samples/", fileName);
			let sketchDoc = sketchdev(sketchFile);

			let distDir = path.join(outDir, path.basename(fileName, ".sketch") + "-dist", "/");
			await sketchDoc.exportIcons(distDir);
		}
	} catch (ex) {
		console.log("UNEXPECTED ERROR CATCH\n", ex);
	}
}

