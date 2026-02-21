import type { Configuration } from "../../di/configuration.js";

export interface Task<I extends object, O extends object> {
    execute(input: I, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<O>;
}
