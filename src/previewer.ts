import * as http from "http";
import * as URL from "url";
import * as Path from "path";
import * as fs from "fs";
import socketIO = require("socket.io");
function getMimeType(file) {
	var i = file.lastIndexOf(".");
	const mimeTypes = {
		".bmp": "image/bmp",
		".css": "text/css",
		".gif": "image/gif",
		".htm": "text/html",
		".html": "text/html",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".js": "application/javascript",
		".json": "application/json",
		".otf": "font/opentype",
		".png": "image/png",
		".text": "text/plain"
	};
	return mimeTypes[(i < 0 ? "" : file.substr(i)).toLowerCase()] || "unknown";
}
export var server: http.Server | undefined;
export var socket: any;
export var BasePath: string = "";
export function run(port: number, basePath: string, log: (text: string) => void): false | string {
	const replacer: (data: Buffer) => string = (_) => _.toString().replace("<!-- INSERT DEBUG CODE HERE -->", injectionCode);
	server = http.createServer((req, res) => {
		var url = URL.parse(req.url, true);
		var path = decodeURIComponent(url.pathname);
		if (path == "/") path += "index.html";
		var fullPath = Path.join(basePath, path);
		var logText = req.method + " " + path + " -> " + fullPath;
		fs.exists(fullPath, (exists) => {
			if (!exists) {
				res.writeHead(404);
				res.write("<h1>404 Not Found</h1>Requested: " + path + "<br>local file " + fullPath + " was not found.");
				res.end();
				logText += " :404";
				log(logText);
				return;
			}
			fs.readFile(fullPath, (err, data) => {
				if (err) {
					res.writeHead(500);
					res.write("<h1>500 Internal Error</h1>Requested: " + path + "<br>local file: " + fullPath + "<br>Error: " + err.name + "<br><code>" + err.message + "</code>");
					res.end();
					logText += " :500 - " + err.name + " :: " + err.message;
					log(logText);
					return;
				}
				var mime = getMimeType(fullPath);
				res.writeHead(200, { "content-type": mime });
				res.write(mime == "text/html" ? replacer(data) : data);
				res.end();
				logText += " :200";
				log(logText);
			});
		});
	});
	socket = socketIO(server);
	socket.on('connection', (socket) => {
		log('a browser connected');
		socket.on('disconnect', () => {
			console.log('browser disconnected');
		});
	});
	server.listen(port);
	BasePath = basePath;
	return "http://localhost:" + port + "/";
}
export function stop(cb: () => void) {
	if (server) {
		server.close(() => { server = undefined; cb() });
	} else cb();
}
export function reload() {
	socket.emit('reload');
}
const injectionCode = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.slim.js"></script>
<script>
	io = io.connect();
	io.on('reload', (data)=> {
		location.reload();
	});
</script>
`