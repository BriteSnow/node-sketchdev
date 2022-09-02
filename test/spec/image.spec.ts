import { saferRemove } from 'fs-aux';
import { exec } from '../../src/executor.js';
import { getTestDir, TEST_SKETCH_FILE } from '../test-utils.js';



describe('image', async function () {


	it('image-ico-sprite-svg', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'svg',
				out: distDir + 'sprite.svg',
				artboard: /^ico\/.*/,
				flatten: '-'
			},
			log: 'warning'
		});

	});

	it('image-ico-sprite-ts', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await exec({
			input: TEST_SKETCH_FILE,
			output: {
				type: 'svg',
				out: distDir + 'sprite.ts',
				artboard: /^ico\/.*/,
				flatten: '-'
			},
			log: 'warning'
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