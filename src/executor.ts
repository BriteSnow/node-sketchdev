import { asArray } from 'utils-min';
import { Config, ImageOutput, Output, StyleOutput } from './config';
import { sketchDoc, SketchDoc } from './sketch-doc';


export async function exec(config: Config) {

	const doc = sketchDoc(config.input);

	const outputs: Output[] = asArray(config.output);

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