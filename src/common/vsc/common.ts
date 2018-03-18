import * as vscode from "vscode";
export function getConfig<T>(namespace: string, val: string): T {
	return vscode.workspace.getConfiguration(namespace).get(val) as T;
}