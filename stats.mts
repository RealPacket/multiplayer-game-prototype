// note: would probably write in express.js or another framework but I'd like to not add dependencies.
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from "events";

export interface StatData {
    ticks: number
    uptime: number
    avgTickTimes: number
    tickTimes: number[]
    messagesSent: number
    messagesReceived: number
    avgTickMessagesSent: number
    tickMessagesSent: number[]
    avgTickMessagesReceived: number
    tickMessagesReceived: number[]
    bytesSent: number
    bytesReceived: number
    avgTickByteSent: number
    tickBytesSent: number[]
    avgTickByteReceived: number
    tickBytesReceived: number[]
    playerCount: number
    playersJoined: number
    playersLeft: number
    playersRejected: number
    bogusAmogusMessages: number
}

export interface BaseStat {
    getStat(this: BaseStat): string;
}

export interface Counter extends BaseStat {
    kind: 'counter',
    counter: number,
    description: string,
}
export interface Average extends BaseStat {
    kind: 'average';
    samples: Array<number>;
    description: string;
    pushSample(sample: number): void;
    average(this: Average): number
}

export interface Timer extends BaseStat {
    kind: 'timer',
    startedAt: number,
    description: string,
}

export type Stat = Counter | Average | Timer;
export type Stats = { [key: string]: Stat };

export class StatsServer {
    server: Server;
    event: EventEmitter;
    path: string;
    constructor(options: { port: number, path?: string }) {
        const {port, path: path_} = options;
        this.path = path_ ?? "/";
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
            this.event.on("update", (stats: StatData) => {
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
export default StatsServer;
