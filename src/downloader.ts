


import { https } from 'follow-redirects';
import { createWriteStream, mkdirs, pathExists, rename, saferRemove } from 'fs-extra-plus';
import * as Path from 'path';
import { Config } from './config';


export async function downloadOrigin(config: Config, showInfo = true) {
	const { input, origin } = config;
	if (origin == null) {
		throw new Error(`sketchdev warning - cannot download origin (not defined ${origin})`);
	}

	try {
		await downloadFile(origin, input, showInfo);
	} catch (ex) {
		throw ex;
	}

	return true;
}

async function downloadFile(httpSrc: string, localFile: string, showInfo: boolean) {
	const localFileInfo = Path.parse(localFile);
	const tmpFile = Path.join(localFileInfo.dir, `${localFileInfo.name}-download-${Date.now()}${localFileInfo.ext}`);

	if (await pathExists(localFile)) {
		if (showInfo) {
			console.log(`sketchdev info - File ${localFile} already exists. Nothing to do. (delete file to redownload)`);
		}

		return false;
	}

	await mkdirs(localFileInfo.dir);
	const fileWStream = createWriteStream(tmpFile);

	return new Promise(async (res, rej) => {
		try {
			const request = https.get(httpSrc, function (response) {
				response.pipe(fileWStream);
				fileWStream.on('finish', async function () {
					fileWStream.close();
					await rename(tmpFile, localFile);
					res(); // resolve
				});
			}).on('error', async function (err) { // Handle errors
				await saferRemove(tmpFile);
				rej(new Error(`Cannot download ${httpSrc} - error ${err}`));
			});
		} catch (ex) {
			await saferRemove(tmpFile);
			rej(ex);
		}

	});
}
