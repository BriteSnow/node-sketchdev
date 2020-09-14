import { saferRemove } from 'fs-extra-plus';
import { exec } from '../../src/executor';
import { getTestDir, TEST_SKETCH_FILE } from '../test-utils';



describe('image', async function () {


	it('image-ico-svg-sprite', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			warnMissing: true,
			output: {
				type: 'svg',
				out: distDir + 'sprite.svg',
				artboard: /^ico\/.*/,
				flatten: '-'
			}
		});

	});

	it('image-ico-png', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'png',
				out: distDir,
				artboard: /^ico\/.*/
			}
		});

	});

	it('image-ico-svg', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'svg',
				out: distDir,
				artboard: /^ico\/.*/
			}
		});

	});

	it('image-ico-svg-flatten', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'svg',
				out: distDir,
				artboard: /^ico\/.*/,
				flatten: '-'
			}
		});

	});

});