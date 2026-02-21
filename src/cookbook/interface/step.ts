import { Task } from "./task.js";

export type Step =
    | Step[]
    | ExecutableStep<object, object>;

export class ExecutableStep<I extends object, O extends object> {
    id: string;
    task: Task<I, O>;
    mapInput: (previousOutputs: Map<string, object>) => I;

    constructor(
        id: string,
        task: Task<I, O>,
        mapInput: (previousOutputs: Map<string, object>) => I
    ) {
        this.id = id;
        this.task = task;
        this.mapInput = mapInput;
    }

    async execute(
        previousOutputs: Map<string, object>,
        sendMessage: (message: string) => void,
        signal?: AbortSignal
    ): Promise<O> {
        const input = this.mapInput(previousOutputs);
        return this.task.execute(input, sendMessage, signal);
    }
}
