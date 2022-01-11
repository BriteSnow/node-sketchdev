import * as Path from 'path';
import { Config, LogLevel } from './config.js';
import { TOOL_PATH } from './vals.js';
const { mkdirp, pathExists, readFile, writeFile } = (await import('fs-extra')).default;

export type WriteType = 'demo-html' | 'demo-js' | 'demo-css' | 'png' | 'jpeg' | 'svg' | 'color' | 'style';


export class NamedError extends Error {
	constructor(name: string, message?: string) {
		super(message ?? name);
		this.name = name;
	}
}

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
	} else {
		console.log(`sketchdev - Skipping (same content) - ${file}`);
	}
}

async function printWriteInfo(type: WriteType, out: string) {
	const prefix = `${type} generated`.padEnd(21, ' ');
	console.log('sketchdev - ' + prefix + ' -  ' + out);
}

export async function hasSketchApp() {
	return await pathExists(TOOL_PATH);
}

const LOG_INFO = 0;
const LOG_WARN = 1;
const LOG_ERROR = 2;

const levels = ['error', 'warning', 'info'] as const;

export function hasLogLevel(conf: Config, level: LogLevel) {
	const confLevel = conf.log ?? 'error';
	const confLevelIdx = levels.indexOf(confLevel);
	const levelIdx = levels.indexOf(level);
	return (levelIdx <= confLevelIdx);
}





//#region    ---------- naming utils ---------- 
export type ProcessNameOptions = {
	flatten?: string | null,
	replace?: [RegExp, string],
	cssVar?: boolean
};

/** Process a name given the otpional replace and flatten rules */
export function processName(name: string, opts?: ProcessNameOptions) {

	// first the RegEx
	if (opts?.replace) {
		name = name.replace(opts.replace[0], opts.replace[1]);
	}

	// then flatten (if undefined, still default, but if null, then, no flatten)
	if (opts?.flatten || opts?.flatten === undefined) {
		const delim = opts?.flatten ?? '-';
		name = flatten(name, delim);
	}

	if (opts?.cssVar) {
		name = name.replace(/[^\S]/gi, '')
		name = name.replace(/[^0-9a-z\-_]/gi, '_')
	}

	return name;
}

type MatchRule = (string | RegExp);

export function match(nameOrRgx: MatchRule | MatchRule[] | undefined | null, value: string): boolean {
	// if no nameOrRgx, then, we match it.
	if (nameOrRgx == null) return true;

	const rules = Array.isArray(nameOrRgx) ? nameOrRgx : [nameOrRgx];

	for (const rule of rules) {

		// succeed on first match
		if (typeof rule === 'string' && value.startsWith(rule)) {
			return true;
		} else if (value.match(rule)) {
			return true;
		}
	}

	return false;

}

export function flatten(value: string, delim: string) {
	return value.replace(/\//gi, delim);
}
//#endregion ---------- /naming utils ---------- 


//#region    ---------- color utils ---------- 
export type WebColor = {
	rgba: string,
	hex: string,
	hasOpacity: boolean,
	auto: string, // hex if no opacity (alpha == 1), rgba if has some opacity
}
export function getWebColor(vals: [number, number, number, number]): WebColor {
	const [rNum, gNum, bNum, aNum] = vals; // this is the 0 to 1 values
	const [r, g, b] = [Math.round(rNum * 255), Math.round(gNum * 255), Math.round(bNum * 255)];
	const a = Math.round((aNum + Number.EPSILON) * 100) / 100;
	const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
	const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	const hasOpacity = (a !== 1);
	const auto = (hasOpacity) ? rgba : hex;
	return { rgba, hex, hasOpacity, auto };
}

export function toHex(num: number): string {
	return num.toString(16).toUpperCase().padStart(2, '0');
}
//#endregion ---------- /color utils ----------



