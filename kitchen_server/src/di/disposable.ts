export interface Disposable {
    initialize(): Promise<void>;
    dispose(): Promise<void>;
}