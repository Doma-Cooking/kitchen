import { WebSocket } from "ws";
import { dependencies } from "../../server.js";
import { TaskEntity } from "../../domain/entity/taskEntity.js";
import { createMessage } from "../wsServer.js";

export function watchTasks(ws: WebSocket): void {
    const subscription = dependencies.watchTasksUseCase.execute().subscribe({
        next: (tasks: TaskEntity[]) => {
            ws.send(createMessage('data', tasks));
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