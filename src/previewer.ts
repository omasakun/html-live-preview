import * as LS from "./local-server";
import * as fs from "fs";
import socketIO = require("socket.io");
import * as http from "http";
import * as Path from "path";
import { Watcher } from "./watcher";
export class PreviewServer {
	server: http.Server;
	socket: socketIO.Server;
	watcher: Watcher;
	private _basePath = "";
	get basePath() {
		return this._basePath;
	}
	constructor(logger: (_: string) => void, basePath: string) {
		this._basePath = basePath;
		this.server = http.createServer(LS.Providers2ConnectionListener(logger,
			LS.Providers.Sequential([
				{
					condition: (_1, _2, url) => url.endsWith(injectionSWPath),
					_: LS.Providers.Constant(injectionSWCode, "application/javascript")
				},
				{
					condition: () => true,
					_: LS.Providers.LocalFile(basePath, (data, mime) => {
						if (mime == "text/html") {
							return data.toString().replace("<!-- INSERT DEBUG CODE HERE -->", injectionCode);
						} else return data;
					})
				}
			])));
		this.socket = socketIO(this.server);
		this.socket.on('connection', (socket) => {
			console.log('a browser connected');
			socket.on('disconnect', () => {
				console.log('browser disconnected');
			});
		});
		this.watcher = new Watcher();
	}
	listen(port: number) {
		this.server.listen(port);
		this.watcher.start(this.basePath, (path) => this.reload(path));
	}
	/** If the server is already closed, cb will not be called. */
	close(cb: () => void) {
		this.server.close(cb);
		this.socket.close();
		this.watcher.stop();
	}
	reload(file: string) {
		const path = Path.relative(this.basePath, file);
		if (path.startsWith("..")) return;
		const sentPath = Path.join("/", path);
		this.socket.emit("reload-file", sentPath);
	}
	reloadAll() {
		this.socket.emit("reload-all");
	}
}

const injectionSWPath = "vscode-html-live-preview-resources-sw.js";
const injectionCode = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.slim.js"></script>
<script>
(()=>{
	var urls2reload = [location.pathname];
	var io2 = io.connect();
	io2.on('reload-all', ()=> {
		location.reload();
	});
	var timer = Infinity;
	io2.on('reload-file', (data)=> {
		if (timer !== Infinity) clearTimeout(timer);
		if(!urls2reload.some(_=>_==data))return;
		timer = setTimeout(() => { timer=Infinity;location.reload(); }, 500);
	});
	navigator.serviceWorker.register('${injectionSWPath}').then(reg=> {
		console.log('Registration succeeded. Scope is ' + reg.scope);
	}).catch(error=> console.log('Registration failed with ' + error));
	navigator.serviceWorker.addEventListener('message', event => {
		if (event.data.url.startsWith(location.origin) && !event.data.url.startsWith(location.origin+"/socket.io/"))
			urls2reload.push(event.data.url.substr(location.origin.length))
	});
})();
</script>
`;
const injectionSWCode = `
this.addEventListener('fetch', (event) => {
  event.waitUntil((async () => {
    if (!event.clientId) return;
    const client = await clients.get(event.clientId);
    if (!client) return;
    client.postMessage({
      msg: "fetch-url",
      url: event.request.url
    });
  })());
});
`;