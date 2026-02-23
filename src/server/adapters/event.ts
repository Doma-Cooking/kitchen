export interface Event {
    source: 'github' | 'slack';
    sourceId: string;
    payload: Record<string, any>;
    timestamp: Date;
}
