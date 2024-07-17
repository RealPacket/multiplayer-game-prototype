import * as common from './common.mjs'
import type { Player, Direction, AmmaMoving } from './common.mjs';
import type { StatData } from "./stats.mjs";

const DIRECTION_KEYS: { [key: string]: Direction } = {
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyS': 'down',
    'KeyW': 'up',
};

(async () => {
    const gameCanvas = document.getElementById('game') as HTMLCanvasElement | null;
    if (gameCanvas === null) throw new Error('No element with id `game`');
    gameCanvas.width = common.WORLD_WIDTH;
    gameCanvas.height = common.WORLD_HEIGHT;
    const ctx = gameCanvas.getContext("2d");
    if (ctx === null) throw new Error('2d canvas is not supported');

    const ws = new WebSocket(`ws://${window.location.hostname}:${common.SERVER_PORT}`);
    const stats = new EventSource(`http://${window.location.hostname}:${common.STATS_PORT}/`);
    stats.addEventListener("open", _ => {
        console.info("[STATS] Stats Event Source open.");
    })
    let me: Player | undefined = undefined;
    const players = new Map<number, Player>();
    ws.addEventListener("close", (event) => {
        console.log("WEBSOCKET CLOSE", event)
    });
    ws.addEventListener("error", (event) => {
        // TODO: reconnect on errors
        console.log("WEBSOCKET ERROR", event)
    });
    ws.addEventListener("message", (event) => {
        if (me === undefined) {
            const message = JSON.parse(event.data)
            if (common.isHello(message)) {
                me = {
                    id: message.id,
                    x: message.x,
                    y: message.y,
                    moving: {
                        'left': false,
                        'right': false,
                        'up': false,
                        'down': false,
                    },
                    hue: message.hue,
                };
                players.set(message.id, me)
                // console.log(`Connected as player ${me.id}`);
            } else {
                console.log("Received bogus-amogus message from server", message)
                ws.close();
            }
        } else {
            const message = JSON.parse(event.data)
            // console.log('Received message', message);
            if (common.isPlayerJoined(message)) {
                players.set(message.id, {
                    id: message.id,
                    x: message.x,
                    y: message.y,
                    moving: {
                        'left': false,
                        'right': false,
                        'up': false,
                        'down': false,
                    },
                    hue: message.hue,
                })
            } else if (common.isPlayerLeft(message)) {
                players.delete(message.id)
            } else if (common.isPlayerMoving(message)) {
                const player = players.get(message.id);
                if (player === undefined) {
                    console.log(`Received bogus-amogus message from server. We don't know anything about player with id ${message.id}`, message)
                    ws.close();
                    return;
                }
                player.moving[message.direction] = message.start;
                player.x = message.x;
                player.y = message.y;
            } else {
                console.log("Received bogus-amogus message from server", message)
                ws.close();
            }
        }
    });
    stats.addEventListener("message", (e: MessageEvent<string>) => {
        const data: StatData = JSON.parse(e.data);
        const uptime = common.displayTimeInterval(data.uptime);
        /**
         * stats value query selectors:
         * #messages-sent-value
         * #messages-received-value
         * #player-count-value
         * #player-joined-value
         * #players-left-value
         * #bytes-received-value
         * #bytes-sent-value
         */
        document.querySelector("#ticks-value")!.textContent = data.ticks.toLocaleString();
        document.querySelector("#uptime-value")!.textContent = uptime;
        document.querySelector("#messages-sent-value")!.textContent = data.messagesSent.toLocaleString();
        document.querySelector("#messages-received-value")!.textContent = data.messagesReceived.toLocaleString();
        document.querySelector("#player-count-value")!.textContent = data.playerCount.toLocaleString();
        document.querySelector("#player-joined-value")!.textContent = data.playersJoined.toLocaleString();
        document.querySelector("#players-left-value")!.textContent = data.playersLeft.toLocaleString();
        document.querySelector("#bytes-received-value")!.textContent = data.bytesReceived.toLocaleString();
        document.querySelector("#bytes-sent-value")!.textContent = data.bytesSent.toLocaleString();
        document.querySelector("#bogus-messages-value")!.textContent = data.bogusAmogusMessages.toLocaleString();
        document.querySelector("#average-bytes-received-value")!.textContent = data.bytesReceived.toLocaleString();
        document.querySelector("#average-bytes-sent-value")!.textContent = data.bytesSent.toLocaleString();
        document.querySelector("#average-tick-messages-sent-value")!.textContent = data.messagesSent.toLocaleString();
        document.querySelector("#average-tick-messages-received-value")!.textContent = data.messagesReceived.toLocaleString();
    })
    ws.addEventListener("open", (event) => {
        console.log("WEBSOCKET OPEN", event)
    });

    let previousTimestamp = 0;
    const frame = (timestamp: number) => {
        const deltaTime = (timestamp - previousTimestamp) / 1000;
        previousTimestamp = timestamp;

        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // TODO: indicate different states of the client. Like 'connecting', 'error', etc.
        players.forEach((player) => {
            if (me !== undefined && me.id !== player.id) {
                common.updatePlayer(player, deltaTime);
                ctx.fillStyle = `hsl(${player.hue} 70% 40%)`;
                ctx.fillRect(player.x, player.y, common.PLAYER_SIZE, common.PLAYER_SIZE);
            }
        })

        if (me !== undefined) {
            common.updatePlayer(me, deltaTime);
            ctx.fillStyle = `hsl(${me.hue} 100% 40%)`;
            ctx.fillRect(me.x, me.y, common.PLAYER_SIZE, common.PLAYER_SIZE);

            ctx.strokeStyle = "white";
            ctx.lineWidth = 4;
            ctx.beginPath()
            ctx.strokeRect(me.x, me.y, common.PLAYER_SIZE, common.PLAYER_SIZE);
            ctx.stroke();
        }
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame((timestamp) => {
        previousTimestamp = timestamp;
        window.requestAnimationFrame(frame);
    });

    window.addEventListener("keydown", (e) => {
        if (me !== undefined) {
            if (!e.repeat) {
                const direction = DIRECTION_KEYS[e.code];
                if (direction !== undefined) {
                    common.sendMessage<AmmaMoving>(ws, {
                        kind: 'AmmaMoving',
                        start: true,
                        direction
                    })
                }
            }
        }
    });
    window.addEventListener("keyup", (e) => {
        if (me !== undefined) {
            if (!e.repeat) {
                const direction = DIRECTION_KEYS[e.code];
                if (direction !== undefined) {
                    common.sendMessage<AmmaMoving>(ws, {
                        kind: 'AmmaMoving',
                        start: false,
                        direction
                    });
                }
            }
        }
    });
})()
