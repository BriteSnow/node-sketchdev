import { sketchdev } from '../../src';
import { TEST_OUT_DIR, TEST_SKETCH_FILE } from '../test-utils';



describe('style', async function () {


	it('style-list', async () => {
		const sketch = sketchdev(TEST_SKETCH_FILE);

		const styles = await sketch.styles();


	});

	it('style-export', async () => {
		const sketch = sketchdev(TEST_SKETCH_FILE);


		await sketch.exportStyles({
			outFile: TEST_OUT_DIR + 'var-color.css',
			styleName: 'fill/',
			group: 2, // to group as fill/prime/
			ref: ['fill/prime', 'fill/gray', 'fill/second']
		});


	});

});