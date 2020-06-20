import * as vscode from "vscode";
import { TLServer } from "./tl-server";
import path = require("path");

let currentPanel: vscode.WebviewPanel | undefined = undefined;
const DEFAULT_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style type="text/css">
		body {
			margin: 0;
			padding: 0;
			overflow: hidden;
		}

		iframe {
			margin: 0;
			padding: 0;
			width: 100vw;
			height: 100vh;
			border: none;
		}
	</style>
</head>
<body>
	<!-- TODO: Don't hardcode the path -->
	<iframe src="http://localhost:61234"></iframe>
</body>
</html>`;

async function startTLS(context: vscode.ExtensionContext, serverExecPath: string)
{
	try {
		await TLServer.getInstance().start(serverExecPath);
		console.log("temporal-lens-server up & running!");

		const panel = vscode.window.createWebviewPanel("temporal-lens-webview", "Temporal Lens", { viewColumn: vscode.ViewColumn.Active, preserveFocus: false });
		panel.webview.html = DEFAULT_CONTENT;

		panel.iconPath = {
			light: vscode.Uri.file(path.join(context.extensionPath, "media", "tlicon-light.svg")),
			dark: vscode.Uri.file(path.join(context.extensionPath, "media", "tlicon-dark.svg"))
		};

		panel.onDidDispose(() => TLServer.getInstance().shutdown());
	} catch(err) {
		console.error("Failed to start temporal-lens-server", err);
		vscode.window.showErrorMessage(err.message);
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Initializing temporal-lens-vscode...");

	let disposable = vscode.commands.registerCommand("temporal-lens-vscode.openWindow", () => {
		const cfg = vscode.workspace.getConfiguration("temporal-lens-vscode");
		const serverExecPath: string | null | undefined = cfg.get("serverExecutable");

		if(!serverExecPath) {
			vscode.window.showErrorMessage("Sorry, but temporal-lens-server auto download is not yet supported.");
			return;
		}

		if(currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.Active, false);
			return;
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Starting temporal-lens-server...",
			cancellable: false
		}, (progress, token) => startTLS(context, serverExecPath));
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	TLServer.getInstance().shutdown();
}
