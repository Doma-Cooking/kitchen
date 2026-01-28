export interface Task<I extends object, O extends object> {
    execute(input: I, sendMessage: (message: string) => void): Promise<O>;
}