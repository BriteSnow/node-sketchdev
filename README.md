## Intro

Command line (with API available) node module that generate html assets (.svg, .png, .jpeg, .css) from [sketch.app](https://www.sketch.com/) application.

This extension uses [sketchapp tool chain](https://developer.sketch.com/cli/).


## Changelog

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
		type: 'style', // export the style colors only as css var
		out: 'pcss/colors.pcss',
		style: /^clr\/.*/, // only the style that match 
    group: 2 // "comment group" the style names from their number of path element 
             // (clr/prime/900 is 3, so, a value of 2 will group all of the clr/prime together )
	}
	]
}
```
