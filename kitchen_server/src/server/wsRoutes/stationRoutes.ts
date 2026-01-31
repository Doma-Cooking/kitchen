import { WebSocket } from 'ws';
import { stationDependencies, StationEntity } from 'kitchen_station';
import { createMessage } from '../wsServer.js';

export function watchStations(ws: WebSocket): void {
    const subscription = stationDependencies.watchStationsUseCase.execute().subscribe({
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