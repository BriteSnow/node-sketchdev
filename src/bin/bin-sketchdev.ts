#!/usr/bin/env node

import chokidar from 'chokidar';
import { pathExists } from 'fs-extra-plus';
import debounce from 'lodash.debounce';
import minimist, { ParsedArgs } from 'minimist';
import * as Path from 'path';
import { Config } from '../config';
import { downloadOrigin } from '../downloader';
import { exec } from '../executor';


const argv = minimist(process.argv.slice(2), { '--': true });

run(argv);


async function run(argv: ParsedArgs) {
	const configFile = argv.c ?? await findConfig();
	try {
		if (configFile == null || !(await pathExists(configFile))) {
			throw new Error(`ERROR - no sketch.config.js found ${configFile}`);
		}

		const { dir, name } = Path.parse(configFile);
		const modulePath = Path.relative(__dirname, Path.resolve(Path.join(dir, name)) + '.js');
		const conf = await require(modulePath);
		assertConfig(conf);

		if (argv._[0] === 'download') {
			await downloadOrigin(conf);
		} else {
			await runConfig(conf);
		}


	} catch (ex) {
		console.log(`sketchdev error - Cannot process ${configFile} because: ${ex}`);
		process.exit(1);
	}

}


async function runConfig(conf: Config) {

	const { input } = conf;

	if (await pathExists(input)) {
		await exec(conf);

		if (argv.w === true) {
			const codeWatch = chokidar.watch(input, { depth: 99, ignoreInitial: true, persistent: true });
			const execFn = () => { return exec(conf) };
			const execDebounce = debounce(execFn, 200);
			codeWatch.on('change', execDebounce);
			codeWatch.on('add', execDebounce);
		}
	} else {
		if (conf.warnMissing === true) {
			console.log(`sketchdev warning - file ${conf.input} not found - doing nothing`);
		}
	}
}


function assertConfig(val: any): asserts val is Config {
	if (val.input == null || val.output == null) {
		throw new Error(`sketchdev error - config not valid missing .input or .output`)
	}
}
async function findConfig() {
	const files = ['.sketchdev.config.js', 'sketchdev.config.js'];

	for (const file of files) {
		if (await pathExists(file)) {
			return file;
		}
	}
	return null;
}


