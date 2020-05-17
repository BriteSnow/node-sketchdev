import { Readable } from 'stream';
import yauzl, { ZipFile as YZip } from 'yauzl-promise';


export class ZipFile {

	#file: string;

	constructor(file: string) {
		this.#file = file;
	}

	async loadJson(entryName: string) {
		const yzip = await this.yZip();

		const entry = (await yzip.readEntries()).find(e => e.fileName === 'document.json')!;
		const readStream = await yzip.openReadStream(entry);
		const content = await streamToString(readStream);
		const result = JSON.parse(content);

		await yzip.close();
		return result;
	}

	private async yZip(): Promise<YZip> {
		return yauzl.open(this.#file);
	}
}


function streamToString(stream: Readable): Promise<string> {
	const chunks: Uint8Array[] = [];
	return new Promise((resolve, reject) => {
		stream.on('data', chunk => { chunks.push(chunk) }); // chunk: Uint8Array
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
	})
}

