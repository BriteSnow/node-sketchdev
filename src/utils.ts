import { pathExists } from 'fs-extra-plus';
import { TOOL_PATH } from './vals';

export async function printGenerated(type: 'demo-html' | 'png' | 'jpeg' | 'svg' | 'style', out: string) {
	const prefix = `${type} generated`.padEnd(21, ' ');
	console.log('sketchdev - ' + prefix + ' -  ' + out);
}

export async function hasSketchApp() {
	return await pathExists(TOOL_PATH);
}