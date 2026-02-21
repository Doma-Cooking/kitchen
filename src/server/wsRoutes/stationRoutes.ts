import { WebSocket } from 'ws';
import { dependencies } from '../../server.js';
import type { StationEntity } from '../../domain/entity/stationEntity.js';
import { createMessage } from '../wsServer.js';

export function watchStations(ws: WebSocket): void {
    const subscription = dependencies.watchStationsUseCase.execute().subscribe({
        next: (stations: StationEntity[]) => {
            ws.send(createMessage('data', stations));
        },
        error: (err: Error) => {
            ws.send(createMessage('error', err.message));
        }
    });

    ws.on('close', () => {
        subscription.unsubscribe();
    });

    ws.on('error', () => {
        subscription.unsubscribe();
    });
}