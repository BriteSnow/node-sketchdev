import { sketchdev } from '../../src';
import { TEST_SKETCH_FILE } from '../test-utils';



describe('style', async function () {


	it('style-base', async () => {
		const sketch = sketchdev(TEST_SKETCH_FILE);


		console.log('>>>>', sketch);

	});

});