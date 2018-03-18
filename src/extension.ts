'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as status from './common/vsc/statusBar';
import * as vscCommon from './common/vsc/common';
import * as outPanel from './common/vsc/outputPanel';
import * as fileHelper from './common/node/file';
import * as Previewer from "./previewer";
var watching = false;

export function activate(context: vscode.ExtensionContext) {
	let addCommand =
		(command: string, callback: (...args: any[]) => any, thisArg?: any) =>
			context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));
	// init
	status.setContent("[html-preview]", undefined, "HTML Live Preview is now active.");
	setTimeout(() => updateStatus(), 2000);
	outPanel.item("HTML LivePreview");
	outPanel.show("Start", ["Extension was Activated!"]);
	context.subscriptions.push(status, outPanel, { dispose: () => Previewer.stop(() => 0) });
	// add Commands
	addCommand('htmlLivePreview.command.startWatching', () => {
		watching = true;
		updateStatus();
		startWatching();
	});
	addCommand('htmlLivePreview.command.stopWatching', () => {
		watching = false;
		updateStatus();
		stopWatching();
	});
	context.subscriptions.push(
		vscode.workspace.onDidChangeWorkspaceFolders(() => onChangeWS()));
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((doc) => {
			Previewer.reload();
			outPanel.item().appendLine("Send a reload request to browsers");
		})
	);
}
function updateStatus() {
	if (watching)
		status.setContent("[Preview|On]", undefined, "[ENABLE] Preview HTML real time. Click to disable.", "htmlLivePreview.command.stopWatching");
	else
		status.setContent("[Preview|Off]", undefined, "[DISABLE] Preview HTML real time. Click to enable.", "htmlLivePreview.command.startWatching");
}
function startWatching() {
	if (Previewer.server) {
		vscode.window.showErrorMessage("Server has been already started: " + Previewer.BasePath, "Stop Server").then(_ => _ == "Stop Server" ? stopWatching() : 0);
		return;
	}
	vscode.window.showInformationMessage("Hint: Use <!-- INSERT DEBUG CODE HERE --> to real time update")
	const options = vscode.workspace.getConfiguration("previewServer");
	const port = (options.get("port") || 8080) as number;
	var basePath = "";
	const ws = vscode.workspace.workspaceFolders;
	if (ws.length == 0) {// Opening file
		basePath = path.dirname(vscode.window.activeTextEditor.document.fileName);
	} else {
		basePath = ws[0].uri.fsPath;
	}
	var v = Previewer.run(port, basePath, (_) => outPanel.item().appendLine(_));
	vscode.window.showInformationMessage("Started http server @ " + v)
	watching = true;
	updateStatus();
}
function onChangeWS() {
	vscode.window.showInformationMessage("Stopped http server " + Previewer.BasePath)
	Previewer.stop(() => {
		watching = false;
		updateStatus();
	});
}
function stopWatching() {
	if (!Previewer.server) {
		vscode.window.showInformationMessage("htmlLivePreview is already disabled.");
		return;
	}
	Previewer.stop(() => {
		watching = false;
		updateStatus();
	});
}