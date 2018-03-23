import { Watcher } from './watcher';
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as status from './common/vsc/statusBar';
import * as vscCommon from './common/vsc/common';
import * as outPanel from './common/vsc/outputPanel';
import * as fileHelper from './common/node/file';
import * as Previewer from "./previewer";
var previewer: Previewer.PreviewServer | false = false;
export function activate(context: vscode.ExtensionContext) {
	let addCommand =
		(command: string, callback: (...args: any[]) => any, thisArg?: any) =>
			context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));
	// init
	status.setContent("[html-preview]", undefined, "HTML Live Preview is now active.");
	setTimeout(() => updateStatus(), 2000);
	outPanel.item("HTML LivePreview");
	outPanel.show("Start", ["Extension was Activated!"]);
	context.subscriptions.push(status, outPanel, { dispose: () => !isWatching() || previewer == false ? 0 : previewer.close(() => 0) });
	// add Commands
	addCommand('htmlLivePreview.command.startWatching', () => {
		updateStatus();
		startWatching();
	});
	addCommand('htmlLivePreview.command.stopWatching', () => {
		updateStatus();
		stopWatching();
	});
	addCommand('htmlLivePreview.command.reload', () => {
		reloadCommand();
	});
	context.subscriptions.push(
		vscode.workspace.onDidChangeWorkspaceFolders(() => onChangeWS()));
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((doc) => {
			if (!isWatching() || previewer == false) return;
			previewer.reload(doc.fileName);
			outPanel.item().appendLine("Send a reload request to browsers - "+doc.fileName);
		})
	);
}
function startWatching() {
	if (isWatching() && previewer != false) {
		vscode.window.showErrorMessage("Server has been already started: " + previewer.basePath, "Stop Server").then(_ => _ == "Stop Server" ? stopWatching() : 0);
		return;
	}
	status.setContent("Starting...");
	vscode.window.showInformationMessage("Hint: Use <!-- INSERT DEBUG CODE HERE --> to real time update");
	const options = vscode.workspace.getConfiguration("previewServer");
	const port = (options.get("port") || 8080) as number;
	var basePath = "";
	const ws = vscode.workspace.workspaceFolders;
	if (ws.length == 0) {// Opening file
		basePath = path.dirname(vscode.window.activeTextEditor.document.fileName);
	} else {
		basePath = ws[0].uri.fsPath;
	}
	vscode.window.showInformationMessage("Started http server @ localhost:" + port);
	launchServer(basePath, port);
	updateStatus();
}
function reloadCommand() {
	if (!isWatching() || previewer == false) {
		vscode.window.showInformationMessage("htmlLivePreview is already disabled.");
		return;
	}
	previewer.reloadAll();
	outPanel.item().appendLine("Send full-reload request to browsers");	
	status.setContent("Reloaded", "#33FF33");
	setTimeout(() => updateStatus(), 1000);
}
function onChangeWS() {
	if (!isWatching() || previewer == false) return;
	vscode.window.showInformationMessage("Stopped http server " + previewer.basePath);
	stopWatching();
}
function stopWatching() {
	if (!isWatching()) {
		vscode.window.showInformationMessage("htmlLivePreview is already disabled.");
		return;
	}
	status.setContent("Closing...", undefined, "You can close the server only if no browser is connected to the server. If you can't close the server, try reloading the browser tab.");
	closeServer(() => updateStatus());
}
function updateStatus() {
	if (isWatching())
		status.setContent("[Preview|On]", undefined, "[ENABLE] Preview HTML real time. Click to disable.", "htmlLivePreview.command.stopWatching");
	else
		status.setContent("[Preview|Off]", undefined, "[DISABLE] Preview HTML real time. Click to enable.", "htmlLivePreview.command.startWatching");
}
function launchServer(basePath: string, port: number) {
	if (previewer) throw "ERROR";
	previewer = new Previewer.PreviewServer((_) => outPanel.item().appendLine(_), basePath);
	previewer.listen(port);
}
function isWatching() {
	return previewer != false;
}
function closeServer(cb: () => void) {
	if (previewer == false) throw "ERROR";
	previewer.close(() => {
		previewer = false;
		cb();
	});
}