import * as http from "http";
import * as URL from "url";
import * as Path from "path";
import * as fs from "fs";
import * as MIME from "mime-types";
/**Local Server Provider*/
type LSProvider =
	(logger: (_: string) => void, req: http.IncomingMessage, res: http.ServerResponse, url: string) => void
/**Local Server Provider Condition */
type LSPCondition =
	(logger: (_: string) => void, req: http.IncomingMessage, url: string) => void
interface LocalServerOptions {
	server: http.Server | undefined
	port: number
}
export function getMimeType(file) {
	return MIME.lookup(file) || "unknown";
}
export namespace Providers {
	export var Error: (errNo: number, msg: string) => (detail: string) => LSProvider
		= (errNo, msg) => (detail) => (logger, req, res, url) => {
			res.writeHead(errNo);
			res.write("<h1>" + errNo + " " + msg + "</h1>Requested: " + url + "<br><pre>" + detail + "</pre>");
			res.end();
			logger(errNo + " :: " + url)
			return;
		}
	export var NotFound: (detail: string) => LSProvider
		= Error(404, "Not Found")
	export var InternalError: (detail: string) => LSProvider
		= Error(500, "Internal Error")
	export var LocalFile: (basePath: string, replacer: (data: string, mime: string) => string) => LSProvider
		= (basePath, replacer) => ((logger, req, res, url) => {
			if (url == "/") url += "index.html";
			var fullPath = Path.join(basePath, url);
			var logText = req.method + " " + url + " -> " + fullPath;
			fs.exists(fullPath, (exists) => {
				if (!exists) {
					NotFound("local file " + fullPath + " was not found.")(logger, req, res, url);
					return;
				}
				fs.readFile(fullPath, (err, data) => {
					if (err) {
						InternalError("Error: " + err.name + "\n" + err.message)(logger, req, res, url);
						return;
					}
					var mime = getMimeType(fullPath);
					res.writeHead(200, { "content-type": mime, "Cache-Control": "no-cache" });
					res.write(replacer(data.toString(), mime));
					res.end();
					logger("200 :: " + url + " -> " + fullPath);
					return;
				});
			});
			return;
		});
	export var Sequential: (providers: { condition: LSPCondition, _: LSProvider }[]) => LSProvider
		= (providers) => (logger, req, res, url) => {
			for (let i = 0; i < providers.length; i++) {
				if (providers[i].condition(logger, req, url)) {
					providers[i]._(logger, req, res, url);
					return;
				}
			}
			NotFound("No provider was provided. @ Providers.Sequential");
		}
	export var Constant: (contents: string, mime: string) => LSProvider
		= (contents, mime) => (logger, req, res, url) => {
			res.writeHead(200, { "content-type": mime });
			res.write(contents);
			res.end();
			logger(200 + " :: " + url)
			return;
		}

	//
}
export function Providers2ConnectionListener(logger: (_: string) => void, provider: LSProvider) {
	return (req: http.IncomingMessage, res: http.ServerResponse) => {
		var url = decodeURIComponent(URL.parse(req.url, true).pathname);
		provider(logger, req, res, url);
	}
}