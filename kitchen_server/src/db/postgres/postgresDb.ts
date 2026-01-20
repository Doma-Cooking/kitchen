import postgres, { Sql } from 'postgres';

export class PostgresDb {
    readonly sql: Sql;
    private listenHandles = new Map<string, { unlisten: () => Promise<void> }>();

    constructor(databaseUrl: string) {
        this.sql = postgres(databaseUrl);
    }

    async listen(channel: string, callback: (payload: string) => void): Promise<void> {
        const request = await this.sql.listen(channel, callback);
        this.listenHandles.set(channel, { unlisten: () => request.unlisten() });
    }

    async unlisten(channel: string): Promise<void> {
        const handle = this.listenHandles.get(channel);
        if (handle) {
            await handle.unlisten();
            this.listenHandles.delete(channel);
        }
    }

    async close(): Promise<void> {
        for (const handle of this.listenHandles.values()) {
            await handle.unlisten();
        }
        this.listenHandles.clear();
        await this.sql.end();
    }
}
