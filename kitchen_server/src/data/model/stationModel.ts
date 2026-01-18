export class StationModel {
    id: string;
    contextBytes: Uint8Array;

    constructor(id: string, contextBytes: Uint8Array) {
        this.id = id;
        this.contextBytes = contextBytes;
    }
}