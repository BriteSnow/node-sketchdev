import { saferRemove } from 'fs-extra-plus';
import { exec } from '../../src/executor';
import { getTestDir, TEST_SKETCH_FILE } from '../test-utils';



describe('color', async function () {


	it('color-simple', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);


		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'color',
				out: distDir + 'color.css',
				prefix: 'clr-',
				group: 1,
				ref: ['prime/', 'gray/', 'second/']
			}
		});

	});

});