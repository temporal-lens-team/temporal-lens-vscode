import * as vscode from "vscode";
import { TLServer } from "./tl-server";

export function activate(context: vscode.ExtensionContext) {
	console.log("Initializing temporal-lens-vscode...");

	let disposable = vscode.commands.registerCommand("temporal-lens-vscode.openWindow", () => {
		const cfg = vscode.workspace.getConfiguration("temporal-lens-vscode");
		const serverExecPath: string | null | undefined = cfg.get("serverExecutable");

		if(!serverExecPath) {
			vscode.window.showErrorMessage("Sorry, but temporal-lens-server auto download is not yet supported.");
			return;
		}

		TLServer.getInstance().start(serverExecPath)
			.then((data) => console.log("temporal-lens-server up & running!!"))
			.catch((err) => console.error(err));
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
