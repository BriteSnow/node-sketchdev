## Intro

Experimental node module that uses sketchapp tool chain to streamline designer/developer workflow. The first functionality is outputing Sketch App icon/symbols into SVG symbol sprite to be reused in application code. 

Status: **Experimenal**

## Usuage

```js
const sketchdev = require("sketchdev");

var sketch_file = "./myapp-spec.sketch";

var distSvg = "./dist/svg"; // directory where all individual svg arboard will be exported

// return a promise
return sketchDoc.export({out: distSvg, 
        artboardName: /^ico\/[\w-]*\/\d*$/, // the regex matching artboard that should be exported
        flatten: '-', // if artboards contain '/' it will be stored in the corresponding folder sturucture, "flatten" just flatten the stucture with a a given char that will replace the '/'
        sprite: distSprite + "sprite.svg" // output all svg as symbols in a sprite.svg and generage a sprite-demo.html page as well
        });

```

