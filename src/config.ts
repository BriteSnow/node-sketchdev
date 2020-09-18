
export type LogLevel = 'error' | 'warning' | 'info';

export interface Config {
	/**
	 * If true, will download on sketchdev command if the input is not present and the OS has SketchApp installed
	 * default false, meaning user has to run "npm run sketchdev download" to explicitly download it
	 */
	download?: boolean;
	origin?: string; // e.g. https://github.com/jeremychone/codewalk-s1-sketch-files/raw/main/design-quickstart.sketch
	input: string; // e.g. .design/sketch-file.sketch

	output: Output | Output[];

	/** (default error) (warnings are missing files/app which will do noting) */
	log?: LogLevel;
}

export type Output = ImageOutput | StyleOutput;

export interface ImageOutput {
	type: 'png' | 'jpeg' | 'svg',
	out: string, // dir for png and svg and file path for svg-sprite (or default to sprite.svg)
	artboard: string | RegExp, // maching artboard names 
	flatten?: string; // if present will replace all of the '/' by the value
}

export interface StyleOutput {
	type: 'style',
	out: string, // dir or file were to put the pcss
	style: string | RegExp, // maching style names 
	group?: number, //  e.g., 2 - to group as fill/prime/
	ref?: string[], // reference style to come first e.g., ['fill/prime', 'fill/gray', 'fill/second']
}