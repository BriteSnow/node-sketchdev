import { asArray } from 'utils-min';
import { Config, ImageOutput, Output, StyleOutput } from './config';
import { sketchDoc, SketchDoc } from './sketch-doc';
import { hasSketchApp } from './utils';
import { TOOL_PATH } from './vals';


export async function exec(config: Config) {

	const doc = sketchDoc(config.input);

	const outputs: Output[] = asArray(config.output);

	if (!(await hasSketchApp())) {
		if (config.warnMissing === true) {
			console.log(`sketchdev warning - sketchapp tooling ${TOOL_PATH} not found - doing nothing`);
		}
		return;
	}

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

