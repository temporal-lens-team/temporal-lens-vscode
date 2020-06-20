import * as vscode from "vscode";
import child_process = require("child_process");
import http = require("http");
import fs = require("fs");
import path = require("path");

const NUM_ATTEMPS = 10;

export class TLServer {
    private static instance: TLServer | undefined = undefined;
    private port: number = 61234;
    private keepAliveInterval: NodeJS.Timeout | undefined = undefined;
    private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel("Temporal Lens Server");
    private startError: string | undefined = undefined;

    public static getInstance(): TLServer {
        if(!TLServer.instance) {
            TLServer.instance = new TLServer();
        }

        return TLServer.instance;
    }

    private constructor() {
    }

    public getBaseURI(): string {
        return `http://127.0.0.1:${this.port}`;
    }

    public isAlive(): boolean {
        return this.keepAliveInterval !== undefined;
    }

    public async start(serverExecutable: string): Promise<void> {
        if(this.keepAliveInterval) {
            //Already started
            return;
        }

        if(!fs.existsSync(serverExecutable)) {
            throw new Error("temporal-lens-executable does not exist");
        }

        this.startError = undefined;
        const serverProc = child_process.spawn(serverExecutable, { detached: true, cwd: path.dirname(serverExecutable) });

        serverProc.stdout.on("data", (data) => {
            this.outputChannel.appendLine(data);
        });

        serverProc.stderr.on("data", (data) => {
            this.outputChannel.appendLine(data);
        });

        serverProc.on("error", (err) => {
            if(!this.startError) {
                this.startError = err.message;
            }
        });

        serverProc.on("close", (code) => {
            this.outputChannel.appendLine(`temporal-lens-server process ended with exit code ${code}`);

            if(this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = undefined;
            }

            if(!this.startError) {
                this.startError = "Process ended unexpectedly";
            }
        });

        serverProc.unref(); //Not sure I should actually do that

        for(let i = 0; i < NUM_ATTEMPS; i++) {
            if(this.startError) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            const ok: boolean = await new Promise(resolve => {
                http.get(this.getBaseURI(), (res) => resolve(res.statusCode === 200))
                    .on("error", (err) => resolve(false))
                    .end();
            });

            if(ok) {
                //We got a successful response!
                this.keepAliveInterval = setInterval(() => this.keepAlive(), 15000);
                return;
            }
        }

        if(this.startError) {
            throw new Error("Could not start temporal-lens-server: " + this.startError);
        } else {
            throw new Error(`Failed to contact temporal-lens-server after ${NUM_ATTEMPS} attempts`);
        }
    }

    private keepAlive() {
        http.get(this.getBaseURI() + "/serverctl/keep-alive").on("error", (e) => {
            console.log(`Failed to send keep-alive request to temporal-lens-server: ${e.message}`);
        }).end();
    }
}
