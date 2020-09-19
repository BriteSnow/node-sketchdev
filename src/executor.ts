import { pathExists } from 'fs-extra-plus';
import { asArray } from 'utils-min';
import { Config, ImageOutput, Output, StyleOutput } from './config';
import { downloadOrigin } from './downloader';
import { sketchDoc, SketchDoc } from './sketch-doc';
import { hasLogLevel, hasSketchApp, NamedError } from './utils';
import { TOOL_PATH } from './vals';

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
			await execStyleOutput(doc, output);
		} else {
			await execImageOutput(doc, output);
		}
	}
}

async function execImageOutput(doc: SketchDoc, output: ImageOutput) {
	const { type, out, artboard, flatten } = output;

	const format = type;


	await doc.exportArtboards({
		format,
		out,
		artboardName: artboard,
		flatten
	});
}

async function execStyleOutput(doc: SketchDoc, output: StyleOutput) {
	const { out, style, group, ref } = output;

	await doc.exportStyles({
		outFile: out,
		styleName: style,
		group,
		ref
	})
}

