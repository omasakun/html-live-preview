import * as fs from 'fs';
import * as path from 'path'
export function write2file(targetFileUri: string, data) {
	return new Promise<{}>((resolve, reject) => {
		makeDirIfNotExist(path.dirname(targetFileUri));
		fs.writeFile(targetFileUri, data, 'utf8', (err) => {
			if (err) reject(err);
			else resolve();
		});
	})
}
export function makeDirIfNotExist(dir: string) {
	if (fs.existsSync(dir)) return;
	if (!fs.existsSync(path.dirname(dir)))
		this.MakeDirIfNotAvailable(path.dirname(dir));
	fs.mkdirSync(dir);
}