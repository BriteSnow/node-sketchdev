import { saferRemove } from 'fs-extra-plus';
import { downloadOrigin } from '../../src/downloader.js';
import { getTestDir } from '../test-utils.js';



describe('download', async function () {


	it('download-quickstart', async function () {
		const distDir = getTestDir(this.test?.title!);

		await saferRemove(distDir);

		await downloadOrigin({
			origin: 'https://raw.githubusercontent.com/jeremychone/codewalk-s1-sketch-files/main/design-quickstart.sketch',
			input: distDir + 'test-download.sketch',
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