import { mkdirp, pathExists, readFile, writeFile } from 'fs-extra-plus';
import * as Path from 'path';
import { TOOL_PATH } from './vals';

type WriteType = 'demo-html' | 'png' | 'jpeg' | 'svg' | 'style';



export async function writeToFile(type: WriteType, file: string, content: string, onlyIfChanged = true) {
	const dir = Path.dirname(file);
	await mkdirp(dir);

	let doWrite = true;

	if (onlyIfChanged) {
		if (await pathExists(file)) {
			const existingContent = await readFile(file, 'utf-8');
			if (content === existingContent) {
				doWrite = false;
			}
		}
	}

	if (doWrite) {
		await writeFile(file, content);
		await printWriteInfo(type, file);
	}
}

async function printWriteInfo(type: WriteType, out: string) {
	const prefix = `${type} generated`.padEnd(21, ' ');
	console.log('sketchdev - ' + prefix + ' -  ' + out);
}

export async function hasSketchApp() {
	return await pathExists(TOOL_PATH);
}