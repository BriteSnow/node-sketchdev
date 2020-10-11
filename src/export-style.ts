import { StyleOutput } from './config';
import { SketchDoc } from './sketch-doc';
import { getWebColor, match, processName, writeToFile } from './utils';


export async function exportStyles(doc: SketchDoc, output: StyleOutput) {
	const { out: outFile, style: styleName, group, ref } = output;


	const styles = await doc.styles();
	const refMode = (ref != null) ? true : false;
	const groupLevel = group;

	type CssVar = { name: string, hex: string, rgba: string, isRef: boolean, group?: string };

	//// build the css vars
	let cssRefVars: (CssVar & { isRef: true })[] = [];
	let cssOtherVars: (CssVar & { isRef: false })[] = [];

	for (const style of styles) {
		if (match(styleName, style.name) && style.fill != null) {
			let group: string | undefined;
			if (groupLevel != null) {
				group = style.name.split('/').slice(0, groupLevel).join('/');
				// apply same processing as name
				group = processName(group);
			}
			const name = processName(style.name);
			const { rgba, hex } = getWebColor(style.fill);
			if (refMode && match(ref!, style.name)) {
				cssRefVars.push({ name, hex, rgba, isRef: true, group });
			} else {
				cssOtherVars.push({ name, hex, rgba, isRef: false, group });
			}
		}
	}

	cssRefVars = cssRefVars.sort((a, b) => a.name.localeCompare(b.name));
	cssOtherVars = cssOtherVars.sort((a, b) => a.name.localeCompare(b.name));

	//// build cssString
	const cssScope = 'root';
	let css = `:${cssScope}{\n`;

	const refVarByRgba: { [rgba: string]: { name: string, hex: string, rgba: string } } = {};
	let previousGroup: string | undefined;

	for (const cssVar of cssRefVars) {
		// add group if needed
		const group = cssVar.group
		if (group) {
			if (group !== previousGroup) {
				css += `\n  /* ${group} */\n`
				previousGroup = group;
			}
		}

		css += `\t--${cssVar.name}: ${cssVar.hex}; \n`;
		refVarByRgba[cssVar.rgba] = cssVar;
	}

	// Do not split if we already have groups
	if (!previousGroup && cssRefVars.length > 0) {
		css += '\n';
	}

	for (const cssVar of cssOtherVars) {
		// add group if needed
		const group = cssVar.group
		if (group) {
			if (group !== previousGroup) {
				css += `\n  /* ${group} */\n`
				previousGroup = group;
			}
		}

		const refVar = refVarByRgba[cssVar.rgba];
		if (refVar) {
			css += `\t--${cssVar.name}: var(--${refVar.name}); /* ${cssVar.hex} */\n`;
		} else {
			css += `\t--${cssVar.name}: ${cssVar.hex};\n`;
		}

	}

	css += '}\n';


	//// write
	await writeToFile('style', outFile, css);
}