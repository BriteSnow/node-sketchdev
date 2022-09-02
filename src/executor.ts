import { pathExists } from 'fs-aux';
import { asArray } from 'utils-min';
import { Config, ImageOutput, Output } from './config.js';
import { downloadOrigin } from './downloader.js';
import { exportColors } from './export-color.js';
import { exportImages } from './export-image.js';
import { exportStyles } from './export-style.js';
import { ExportArtboardsOptions, sketchDoc, SketchDoc } from './sketch-doc.js';
import { hasLogLevel, hasSketchApp, NamedError } from './utils.js';
import { TOOL_PATH } from './vals.js';

export const ERROR_INPUT_NOT_FOUND = 'ERROR_INPUT_NOT_FOUND';

export async function exec(config: Config) {

	if (!(await hasSketchApp())) {
		if (hasLogLevel(config, 'warning')) {
			console.log(`sketchdev warning - sketchapp tooling ${TOOL_PATH} not found - doing nothing`);
		}
		return;
	}

	if (config.download === true && !(await pathExists(config.input))) {
		await downloadOrigin(config, false);
	}

	if ((!await pathExists(config.input))) {
		throw new NamedError('ERROR_INPUT_NOT_FOUND');
	}

	const outputs: Output[] = asArray(config.output);

	const doc = sketchDoc(config.input);

	for (const output of outputs) {
		if (output.type === 'style') {
			await exportStyles(doc, output);
		} else if (output.type == 'color') {
			await exportColors(doc, output);
		} else {
			await execImageOutput(doc, output);
		}
	}
}

async function execImageOutput(doc: SketchDoc, output: ImageOutput) {
	const { type, out, artboard, flatten } = output;

	const format = type;

	const opts: ExportArtboardsOptions = {
		format,
		out,
		artboardName: artboard,
		flatten
	};

	await exportImages(doc, opts);
	// await doc.exportArtboards({
	// 	format,
	// 	out,
	// 	artboardName: artboard,
	// 	flatten
	// });
}

