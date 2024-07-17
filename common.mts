import type * as ws from 'ws';

export const SERVER_PORT = 6970;
export const WORLD_FACTOR = 200;
export const WORLD_WIDTH = 4*WORLD_FACTOR;
export const WORLD_HEIGHT = 3*WORLD_FACTOR;
export const PLAYER_SIZE = 30;
export const PLAYER_SPEED = 500;

export enum MessageKind {
    HELLO,
    PLAYER_JOINED,
    PLAYER_LEFT,
    PLAYER_MOVING,
    MOVE_SELF
}

export type Direction = 'left' | 'right' | 'up' | 'down';

type Moving = {
    [key in Direction]: boolean
}

export type Vector2 = {x: number, y: number};
export const DIRECTION_VECTORS: {[key in Direction]: Vector2} = {
    'left':  {x: -1, y: 0},
    'right': {x: 1, y: 0},
    'up':    {x: 0, y: -1},
    'down':  {x: 0, y: 1},
};

function isDirection(arg: any): arg is Direction {
    return DIRECTION_VECTORS[arg as Direction] !== undefined;
}

export interface Player {
    id: number,
    x: number,
    y: number,
    moving: Moving,
    hue: number,
}

export function isNumber(arg: any): arg is number {
    return typeof(arg) === 'number';
}

export function isString(arg: any): arg is string {
    return typeof(arg) === 'string';
}

export function isBoolean(arg: any): arg is boolean {
    return typeof(arg) === 'boolean';
}

export interface Hello {
    kind: MessageKind.HELLO,
    id: number,
    x: number,
    y: number,
    hue: number,
}

export function isHello(arg: any): arg is Hello {
    return arg
        && arg.kind === MessageKind.HELLO
        && isNumber(arg.id);
}

export interface PlayerJoined {
    kind: MessageKind.PLAYER_JOINED,
    id: number,
    x: number,
    y: number,
    hue: number,
}

export function isPlayerJoined(arg: any): arg is PlayerJoined {
    return arg
        && arg.kind === MessageKind.PLAYER_JOINED
        && isNumber(arg.id)
        && isNumber(arg.x)
        && isNumber(arg.y)
        && isNumber(arg.hue)
}

export interface PlayerLeft {
    kind: MessageKind.PLAYER_LEFT,
    id: number,
}

export function isPlayerLeft(arg: any): arg is PlayerLeft {
    return arg
        && arg.kind ===  MessageKind.PLAYER_LEFT
        && isNumber(arg.id)
}

export interface AmmaMoving {
    kind:  MessageKind.MOVE_SELF,
    start: boolean,
    direction: Direction,
}

export function isAmmaMoving(arg: any): arg is AmmaMoving {
    return arg
        && arg.kind ===  MessageKind.MOVE_SELF
        && isBoolean(arg.start)
        && isDirection(arg.direction);
}

export interface PlayerMoving {
    kind:  MessageKind.PLAYER_MOVING,
    id: number,
    x: number,
    y: number,
    start: boolean,
    direction: Direction,
}

export function isPlayerMoving(arg: any): arg is PlayerMoving {
    return arg
        && arg.kind ===  MessageKind.PLAYER_MOVING
        && isNumber(arg.id)
        && isNumber(arg.x)
        && isNumber(arg.y)
        && isBoolean(arg.start)
        && isDirection(arg.direction);
}

export type Event = PlayerJoined | PlayerLeft | PlayerMoving;

function properMod(a: number, b: number): number {
    return (a%b + b)%b;
}

export function updatePlayer(player: Player, deltaTime: number) {
    let dir: Direction;
    let dx = 0;
    let dy = 0;
    for (dir in DIRECTION_VECTORS) {
        if (player.moving[dir]) {
            dx += DIRECTION_VECTORS[dir].x;
            dy += DIRECTION_VECTORS[dir].y;
        }
    }
    const l = dx*dx + dy*dy;
    if (l !== 0) {
        dx /= l;
        dy /= l;
    }
    player.x = properMod(player.x + dx*PLAYER_SPEED*deltaTime, WORLD_WIDTH);
    player.y = properMod(player.y + dy*PLAYER_SPEED*deltaTime, WORLD_HEIGHT);
}

interface Message {
    kind: MessageKind,
}

export function sendMessage<T extends Message>(socket: ws.WebSocket | WebSocket, message: T): number {
    const text = JSON.stringify(message);
    socket.send(text);
    return text.length;
}
