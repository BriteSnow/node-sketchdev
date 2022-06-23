> Note: Requires `"type": "module"` (i.e., ESM module)

## Intro

Command line (with API available) node module that generate html assets (.svg, .png, .jpeg, .css) from [sketch.app](https://www.sketch.com/) application.

This extension uses [sketchapp tool chain](https://developer.sketch.com/cli/).


## Changelog

- **0.7.2** Jan 23, 2022
  - `.` update dependencies
- **0.7.0 - 0.7.1** Jan 10, 2022
  - `!` update to ESM module
- **0.6.1 - 0.6.5** Oct 11, 2020
  - `+` (big one) Add support for new Sketch Color Variables !!! (replace the current style export)
  - See [Sketch Color Variables Intro (youtube)](https://www.youtube.com/watch?v=3_dvCpetsgc)
  - `+` Added download original and download flag (to automatically download origin)
  - `^` Save file .css and .svg only if content changed	
- **0.6.0** Sep 13, 2020
  - `!` Major refactor, now `sketchdev.config.js` driven. 


## Usage

```sh
npm install -D sketchdev

# create sketchdev.config.js (or .sketchdev.config.js) as below

node ./node_module/.bin/sketchdev
```

**sketchdev.config.js**
```js
module.exports = {
  input: 'design.sketch', // path of the sketch file relative pwd
  
  // support one or more output
	output: [{
		type: 'svg', // supports png, svg, jpeg
		out: 'svg/sprite.svg', // for svg only, if out is a file, it will create a sprite svg
		artboard: /^ico\/.*/, // only export the artboards that match this regex
		flatten: '-' // flatten the artboard '/' with '-' char 
	},
	{
		type: 'color', // export the color variables as css var
		out: 'pcss/colors.pcss',
		name: /^txt\/.*/, // (optional) only the color variables that match txt
    group: 1, // (optional) "comment group" the style names from their number of path element 
							// (prime/900 is 2, so, a value o1 2 will group all of the prime/* 
							// together )
		prefix: 'clr-', // (optional) prefix for the css var names
		ref: ['gray','prime'] // (optional)  define the reference colors that others will use if match
	}
	]
}
```
