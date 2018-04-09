## Intro

Experimental node module that uses sketchapp tool chain to streamline designer/developer workflow. The first functionality is outputing Sketch App icon/symbols into SVG symbol sprite to be reused in application code. 

Status: **Experimetal** APIs will probably change. 

Notes: 
- From version 0.2.0 requires node.js > 8.0.0
- From version 0.3.0 needs to be imported as `{ sketchdev }`
- From version 0.3.0 includes basic typescript defintions.

## Usage

#### .exportIcons

Simpler, exporting icons following the `ico/.../dd` format (see [test/samples/sample-sketch.sketch](https://github.com/BriteSnow/node-sketchdev/blob/master/test/samples/sample-sketch.sketch))

```js
const { sketchdev } = require('sketchdev');

var sketch_file = './myapp-spec.sketch';
var sketch = sketchdev(file); // will return a Sketch object

await sketchdev(file).exportIcons('./dist');

// this will call the .export with the following option
// var svgDir = path.join(distDir, "svg/");
// var spritePath = path.join(distDir, "sprite/sprite.svg");
// 
// var defaultOpts = {
//     out: svgDir,
//     artboardName: /^ico\/[\w-]*\/\d*$/, // the regex matching artboard that should be exported
//     flatten: '-',
//     sprite: spritePath
// };

```

Note: you can override the default above with `.exportIcons(distDir,opts)`

#### .export

Used by exportIcons (with the above default)

```js
const { sketchdev } = require('sketchdev');

var sketch_file = './myapp-spec.sketch';

export(sketch_file);

async function export(file){
       // create a JS object that will represent this sketch document
    var sketchDoc = sketchdev(file); 

    var dist = './dist/'
    var distSvg = dist + 'svg/'; 
    var distSpriteFile = dist + 'sprite/sprite.svg'; 

    // return a promise
    await sketchDoc.export({out: distSvg, 
            artboardName: /^ico\/[\w-]*\/\d*$/, // the regex matching artboard that should be exported
            flatten: '-', // if artboards contain '/' it will be stored in the corresponding folder sturucture, "flatten" just flatten the stucture with a a given char that will replace the '/'
            sprite: distSpriteFile // output all svg as symbols in a sprite.svg and generage a sprite-demo.html page as well
            }); 
}
```


