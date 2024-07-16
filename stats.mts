// note: would probably write in express.js or another framework but I'd like to not add dependencies.
import { createServer, Server } from 'node:http';
import { EventEmitter } from "events";
export default class StatsServer {
    server: Server;
    event: EventEmitter;
    constructor(public port: number = 6971) {
        this.event = new EventEmitter({
            captureRejections: true
        });
        console.log("Created event emitter, creating SSE server on port", port);
        // Create a local server to receive data
        this.server = createServer((_, res) => {
            console.log("New client! Serving headers...");
            // screw CORS
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream'
            });
            res.flushHeaders();
            console.log("Headers served, listening for events...");
            this.event.on("update", stats => {
                console.log("got update", stats);
                // this toy protocol can't handle any messages without IDs.
                // and it breaks if I add the event field after the id field and separate it with a newline.
                res.write(`id: ${Date.now()}\n`);
                res.write(`data: ${JSON.stringify(stats)}\n\n`);
            });
        });

        this.server.listen(port);
    }
    stop() {
        this.server.close().closeAllConnections();
    }
}
