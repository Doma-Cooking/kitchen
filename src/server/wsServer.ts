import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { watchStations } from './wsRoutes/stationRoutes.js';
import { watchOrders } from './wsRoutes/orderRoutes.js';

interface WsMessage<T> {
    type: 'data' | 'error';
    payload: T;
    timestamp: string;
}

export function createMessage(type: 'data' | 'error', payload: unknown): string {
    const message: WsMessage<unknown> = {
        type,
        payload,
        timestamp: new Date().toISOString()
    };
    return JSON.stringify(message);
}

export function setupWsServer(server: HttpServer): WebSocketServer {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket, request) => {
        const path = request.url;

        switch (path) {
            case '/ws/orders':
                watchOrders(ws);
                break;
            case '/ws/stations':
                watchStations(ws);
                break;
            default:
                ws.send(createMessage('error', `Unknown path: ${path ?? 'undefined'}`));
                ws.close();
                return;
        }
    });

    return wss;
}
