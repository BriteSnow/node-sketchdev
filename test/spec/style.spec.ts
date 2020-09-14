import { saferRemove } from 'fs-extra-plus';
import { exec } from '../../src/executor';
import { getTestDir, TEST_SKETCH_FILE } from '../test-utils';



describe('style', async function () {


	it('style-simple', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'style',
				out: distDir + 'style.css',
				style: /^fill\/.*/,
				group: 2,
				ref: ['fill/prime', 'fill/gray', 'fill/second']
			}
		});

	});

});