import { ColorOutput } from './config';
import { SketchDoc } from './sketch-doc';
import { getWebColor, match, processName, WebColor, writeToFile } from './utils';


type CssColorVar = { name: string, webColor: WebColor, isRef: boolean, group?: string };

export async function exportColors(doc: SketchDoc, output: ColorOutput) {
	const { out, name: nameFilter, group, ref, prefix } = output;

	const colors = await doc.colors();

	const refMode = (ref != null) ? true : false;
	const groupLevel = group ?? 0;

	//// build the css vars
	let cssRefVars: (CssColorVar & { isRef: true })[] = [];
	let cssOtherVars: (CssColorVar & { isRef: false })[] = [];

	for (const color of colors) {
		if (match(nameFilter, color.name)) {
			let group: string | undefined;
			if (groupLevel != null) {
				group = color.name.split('/').slice(0, groupLevel).join('/');
				// apply same processing as name
				group = processName(group, { cssVar: true });
			}
			const name = processName(color.name, { cssVar: true });
			const webColor = getWebColor(color.value);
			if (refMode && match(ref!, color.name)) {
				cssRefVars.push({ name, webColor, isRef: true, group });
			} else {
				cssOtherVars.push({ name, webColor, isRef: false, group });
			}
		}
	}

	cssRefVars = cssRefVars.sort((a, b) => a.name.localeCompare(b.name));
	cssOtherVars = cssOtherVars.sort((a, b) => a.name.localeCompare(b.name));

	//// build cssString
	const cssScope = 'root';
	let css = `:${cssScope}{\n`;

	const refVarByRgba: { [rgba: string]: CssColorVar } = {};
	let previousGroup: string | undefined;
	const varPrefix = prefix ?? '';

	/// Do the ref first
	for (const cssVar of cssRefVars) {
		const { group, webColor } = cssVar;
		if (group) {
			if (group !== previousGroup) {
				css += `\n  /* ${group} */\n`
				previousGroup = group;
			}
		}

		css += `\t--${varPrefix}${cssVar.name}: ${webColor.auto}; \n`;
		refVarByRgba[webColor.rgba] = cssVar;
	}

	// Do not split if we already have groups
	if (!previousGroup && cssRefVars.length > 0) {
		css += '\n';
	}

	/// do the other var
	for (const cssVar of cssOtherVars) {
		const { group, webColor } = cssVar;
		// add group if needed
		if (group) {
			if (group !== previousGroup) {
				css += `\n  /* ${group} */\n`
				previousGroup = group;
			}
		}


		const refVar = refVarByRgba[webColor.rgba];
		if (refVar) {
			css += `\t--${varPrefix}${cssVar.name}: var(--${varPrefix}${refVar.name}); /* ${webColor.auto} */\n`;
		} else {
			css += `\t--${varPrefix}${cssVar.name}: ${webColor.auto};\n`;
		}

	}
	css += '}\n';

	//// write
	await writeToFile('color', out, css);

}