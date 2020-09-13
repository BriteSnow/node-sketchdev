

module.exports = {
	input: 'test/.samples/sample-sketch.sketch',
	output: {
		type: 'svg',
		out: 'test/out/.configs/test-config-svg-sprite/' + 'sprite.svg',
		artboard: /^ico\/.*/,
		flatten: '-'
	}
}