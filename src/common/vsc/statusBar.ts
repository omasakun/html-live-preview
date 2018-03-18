import * as vscode from 'vscode';
var _item: vscode.StatusBarItem;
export function item() {
	if (!this._item) {
		this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
		this._item.show();
	}
	return this._item;
}
export function setContent(text: string = "[none]", color: string = "inherit", tooltip: string = undefined, command: string = undefined) {
	this.item().text = text;
	this.item().color = color;
	this.item().tooltip = tooltip;
	this.item().command = command;
}
export function init() {
	this.working("Starting...");
	setTimeout(() => {
		this.notWatching();
	}, 1000);
}
export function dispose() {
	if (this._item)
		this._item.dispose();
}