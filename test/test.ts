import * as fs from 'fs-extra-plus';
import * as Path from 'path';
import { sketchdev } from '../src';

const dir = __dirname;

var sampleFileNames = ["sample-sketch.sketch"];

var outDir = Path.join(dir, ".out/");

performTest();

async function performTest() {
	try {
		// just some simple guard on delete
		if (outDir.endsWith("test/.out/")) {
			await fs.remove(outDir);
			console.log("test cleanup - delete:", outDir);
		}

		for (let fileName of sampleFileNames) {
			let sketchFile = Path.join(dir, "samples/", fileName);
			let sketchDoc = sketchdev(sketchFile);

			let distDir = Path.join(outDir, Path.basename(fileName, ".sketch") + "-dist", "/");
			await sketchDoc.exportIcons(distDir);
			await sketchDoc.exportArtboards({
				format: 'png',
				out: outDir,
				artboardName: /^images\/.*$/
			})
		}
	} catch (ex) {
		console.log("UNEXPECTED ERROR CATCH\n", ex);
	}
}

