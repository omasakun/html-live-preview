import * as vscode from "vscode";
var _msgChannel: vscode.OutputChannel;

export function item(title: string = "Extension") {
	if (!_msgChannel)
		_msgChannel = vscode.window.createOutputChannel(title);
	return _msgChannel;
}
export function show(title: string, body: string[], shouldPopup: boolean = false, addEndLine = true, windowTitle?: string) {
	var tmp = item(windowTitle);
	if (title) tmp.appendLine("== " + title + " ==");
	if (body) body.forEach(msg => tmp.appendLine(msg));
	if (shouldPopup) tmp.show(true);
	if (addEndLine) tmp.appendLine('--------------------');
}
export function hide(windowTitle?: string) {
	item(windowTitle).hide();
}
export function dispose() {
	if (_msgChannel) _msgChannel.dispose();
}