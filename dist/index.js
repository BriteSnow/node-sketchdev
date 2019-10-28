"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra-plus");
const Path = require("path");
const p_spawn_1 = require("p-spawn");
const cheerio = require("cheerio");
const tool_path = "/Applications/Sketch.app/Contents/Resources/sketchtool/bin/sketchtool";
function sketchdev(sketchFile) {
    return new Sketch(sketchFile);
}
exports.sketchdev = sketchdev;
class Sketch {
    constructor(file) {
        this.file = file;
    }
    async artboards(opts) {
        return artboards(this.file, opts);
    }
    async export(opts) {
        return exportFn(this.file, opts);
    }
    async exportIcons(distDir, opts) {
        await fs.mkdirs(distDir);
        // build the defaultOpts
        const svgDir = Path.join(distDir, "svg/");
        const spritePath = Path.join(distDir, "sprite/sprite.svg");
        const defaultOpts = {
            out: svgDir,
            artboardName: /^ico\/[\w-]*\/\d*$/,
            flatten: '-',
            sprite: spritePath
        };
        opts = (opts) ? Object.assign({}, defaultOpts, opts) : defaultOpts;
        return this.export(opts);
    }
}
async function artboards(file, opts) {
    // list the artboards and parse the result into a doc
    const cmdArgs = ['--include-symbols=YES', 'list', 'artboards', file];
    const r = await p_spawn_1.spawn(tool_path, cmdArgs, { capture: "stdout" });
    const docStr = r.stdout;
    const doc = JSON.parse(docStr);
    // todo: use opts.pageName to match the pages we want.
    const pages = doc.pages.filter(p => true);
    const artboards = [];
    const matchArtboardName = (opts) ? opts.name : null;
    for (const page of pages) {
        for (const board of page.artboards) {
            // todo: match with opts.pageName
            if (match(matchArtboardName, board.name)) {
                artboards.push(board);
            }
        }
    }
    return artboards;
}
async function exportFn(file, opts) {
    var _a;
    try {
        const format = (_a = opts.format, (_a !== null && _a !== void 0 ? _a : 'svg'));
        // sketch >= 42
        const args = ['--include-symbols=YES',
            `--format=${format}`];
        // ,'--include-namespaces=NO'
        // what take precedence is the opts.items
        let items = opts.items;
        // if we do not have opts.items and have a opts.artboardName then, we match them.
        if (!items && opts.artboardName) {
            let boards = await artboards(file, { name: opts.artboardName });
            items = boards.map(b => b.id);
        }
        if (items) {
            args.push('--items=' + items.join(','));
        }
        // if we have a opts.flatten option, the output is opts.out + "_tmp/"
        let out = opts.out;
        if (opts.flatten) {
            out = opts.out + "_tmp/";
        }
        args.push('--output=' + out);
        // final arguments
        args.push('export', 'artboards', file);
        // perfom the export
        await p_spawn_1.spawn(tool_path, args, { toConsole: false });
        // Workaround: Need to skeep a beat to make sure the exported files can be found (putting 1 is too low?)
        // Note: Not sure why we do not see the files immediately, as the above exec should yield when completed. 
        //await wait(1500);
        // if we have the opts.flatten attribute, we need to move the _tmp/**.svg to the opts.out dir
        // and flatten the name
        if (opts.flatten) {
            let svgsGlob = Path.join(out, '/**/*.svg');
            let svgFiles = await fs.glob(svgsGlob);
            for (file of svgFiles) {
                // replace the folder path by '-'
                let name = file.substring(out.length).replace(/\//gi, opts.flatten);
                // remove the last -dd
                name = name.replace(/-\d.*$/, '');
                // remove the ventual last .svg
                name = name.replace(/\.svg$/, '');
                let to = Path.join(opts.out, name + ".svg");
                await fs.copy(file, to);
            }
            //remove the out (which is ..._tmp/)
            await fs.saferRemove(out);
        }
        if (opts.sprite) {
            await sprite(opts.out, { out: opts.sprite });
        }
    }
    catch (ex) {
        console.log("ERROR while exporting\n", ex);
    }
}
const cheerioXmlOpts = {
    normalizeWhitespace: true,
    xmlMode: true
};
// merge all .svg from svgDir into a sprite.svg file
// opts.out: the svg file to be created
// opts.trims: (not supported yet, trim 'fill attribute') array of string for each property that need to be trimmed
async function sprite(svgDir, opts) {
    const svgFiles = await fs.glob(`${svgDir}**/*.svg`);
    const content = ['<svg xmlns="http://www.w3.org/2000/svg" style="width:0; height:0; visibility:hidden; display:none">'];
    const symbols = [];
    for (let file of svgFiles) {
        let fileContent = await fs.readFile(file, 'utf8');
        let fileInfo = Path.parse(file);
        let symbol = {
            name: fileInfo.name
        };
        // get the src svg Doc
        let srcDoc = cheerio.load(fileContent, cheerioXmlOpts);
        let $srcSvg = srcDoc("svg");
        // create the new symbol doc
        let symbolDoc = cheerio.load("<symbol />", cheerioXmlOpts);
        let $symbol = symbolDoc("symbol");
        // set the id from the file name
        $symbol.attr("id", symbol.name);
        // get the same viewBox as the svg source element
        let viewBox = $srcSvg.attr("viewBox");
        $symbol.attr("viewBox", viewBox);
        symbol.viewBox = viewBox;
        // append the first g element from the src element to the symbol
        let $g = $srcSvg.children("g").clone();
        $symbol.append($g);
        // remove the fill attribute (since chrome has a bug that prevent it to override presentation attribute with css)
        symbolDoc('[fill]').removeAttr("fill");
        content.push(symbolDoc.xml());
        symbols.push(symbol);
    }
    content.push('</svg>');
    const outInfo = Path.parse(opts.out);
    // create the sprite folder
    await fs.mkdirs(outInfo.dir);
    // write the sprite svg
    const contentStr = content.join("\n");
    console.log('will write sprite to:', opts.out);
    await fs.writeFile(opts.out, contentStr);
    // copy the template file
    const fromDemoPath = Path.join(__dirname, "../template-demo.html");
    const toDemoPath = Path.join(outInfo.dir, outInfo.name + "-demo.html");
    await fs.copy(fromDemoPath, toDemoPath);
}
// --------- /Mobule Methods --------- //
// --------- Utilities --------- //
function match(nameOrRgx, value) {
    // if no nameOrRgx, then, we match it.
    if (!nameOrRgx) {
        return value;
    }
    if (typeof nameOrRgx === 'string') {
        return (nameOrRgx === value);
    }
    // assume it is a regex
    return value.match(nameOrRgx);
}
function wait(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, ms);
    });
}
// --------- /Utilities --------- //
//# sourceMappingURL=index.js.map