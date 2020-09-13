

export async function printGenerated(type: 'demo-html' | 'png' | 'jpeg' | 'svg' | 'style', out: string) {
	const prefix = `${type} generated`.padEnd(21, ' ');
	console.log('sketchdev - ' + prefix + ' -  ' + out);
}