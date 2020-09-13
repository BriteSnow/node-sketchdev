import * as Path from 'path';


export const TEST_DIR = './test/';
export const TEST_OUT_DIR = Path.join(TEST_DIR, '.out/');
export const TEST_SKETCH_FILE = Path.join(TEST_DIR, '.samples/sample-sketch.sketch');

export function getTestDir(sketchFile: string, title: string) {
	return Path.join(TEST_OUT_DIR, `test-${title}/`, Path.basename(sketchFile, ".sketch") + "/");
}