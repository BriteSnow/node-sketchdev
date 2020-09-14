

export interface Config {
	origin?: string; // e.g. https://github.com/jeremychone/codewalk-s1-sketch-files/raw/main/design-quickstart.sketch
	input: string; // e.g. .design/sketch-file.sketch
	download?: string; // (download if not present) e.g. https://some.place.com/sketch-file.sketch

	output: Output | Output[];

	warnMissing?: boolean; // warn if missing file (otherwise silent)
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