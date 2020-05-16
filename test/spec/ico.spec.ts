import * as fs from 'fs-extra-plus';
import * as Path from 'path';
import { sketchdev } from '../../src';
import { TEST_OUT_DIR, TEST_SKETCH_FILE } from '../test-utils';



describe('ico', async function () {


	it('ico-base', async () => {

		// cleanup
		await fs.saferRemove(TEST_OUT_DIR);
		console.log("test cleanup - delete:", TEST_OUT_DIR);

		const sketchDoc = sketchdev(TEST_SKETCH_FILE);

		let distDir = Path.join(TEST_OUT_DIR, Path.basename(TEST_SKETCH_FILE, ".sketch") + "-dist", "/");
		await sketchDoc.exportIcons(distDir);
		await sketchDoc.exportArtboards({
			format: 'png',
			out: TEST_OUT_DIR,
			artboardName: /^images\/.*$/
		})


	});

});