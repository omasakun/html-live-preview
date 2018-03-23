import * as watch from "node-watch";
import * as fs from "fs";
export class Watcher {
	watcher: fs.FSWatcher | false = false;
	start(path: string, onchange: (path: string) => void) {
		if (this.watcher != false) throw "ERROR";
		console.log("watcher", path);
		watch(path, { recursive: true }, (event, filename) => {
			console.log("watcher", event, filename);
			onchange(filename.toString());
		});
	}
	stop() {
		if (this.watcher == false) return;
		this.watcher.close()
		this.watcher = false;
	}
}