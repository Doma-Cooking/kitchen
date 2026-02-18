import { Observable, from, startWith, switchMap } from 'rxjs';
import { randomUUID } from 'crypto';
import { StationModel } from '../model/stationModel.js';
import { StationSource } from './stationSource.js';
import { PostgresDb } from 'kitchen_database';

interface StationRow {
    context_bytes: Buffer;
}

function rowToModel(row: StationRow): StationModel {
    return {
        contextBytes: new Uint8Array(row.context_bytes)
    };
}

export class PostgresStationSource implements StationSource {
    private db: PostgresDb;

    constructor(db: PostgresDb) {
        this.db = db;
    }

    async createStation(stationId: string): Promise<StationModel> {
        const sql = this.db.sql;
        const result = await sql<StationRow[]>`
            INSERT INTO stations (id, context_bytes)
            VALUES (${stationId}, ''::bytea)
            RETURNING *
        `;
        const row = result[0];
        if (!row) {
            throw new Error('Failed to create station');
        }
        return rowToModel(row);
    }

    async getStationById(stationId: string): Promise<StationModel | null> {
        const sql = this.db.sql;
        const result = await sql<StationRow[]>`
            SELECT * FROM stations WHERE id = ${stationId}
        `;
        const row = result[0];
        if (!row) {
            return null;
        }
        return rowToModel(row);
    }

    async updateStation(stationId: string, station: StationModel): Promise<void> {
        const sql = this.db.sql;
        const contextBuffer = Buffer.from(station.contextBytes);
        await sql`
            UPDATE stations SET context_bytes = ${contextBuffer} WHERE id = ${stationId}
        `;
    }

    async deleteStation(stationId: string): Promise<void> {
        const sql = this.db.sql;
        await sql`DELETE FROM stations WHERE id = ${stationId}`;
    }

    private async getStations(): Promise<StationModel[]> {
        const sql = this.db.sql;
        const result = await sql<StationRow[]>`SELECT * FROM stations`;
        return result.map(rowToModel);
    }

    async findStationByRef(ref: string): Promise<string | null> {
        const sql = this.db.sql;
        const result = await sql<{ station_id: string }[]>`
            SELECT station_id FROM station_refs WHERE ref = ${ref}
        `;
        return result[0]?.station_id ?? null;
    }

    async createStationWithRef(ref: string): Promise<string> {
        const sql = this.db.sql;
        const stationId = randomUUID();

        await sql`
            INSERT INTO stations (id, context_bytes)
            VALUES (${stationId}, ''::bytea)
        `;

        const insertResult = await sql<{ station_id: string }[]>`
            INSERT INTO station_refs (ref, station_id)
            VALUES (${ref}, ${stationId})
            ON CONFLICT (ref) DO NOTHING
            RETURNING station_id
        `;

        if (insertResult.length > 0) {
            return stationId;
        }

        // Another call won the race — look up the winner and clean up our orphan
        const existing = await sql<{ station_id: string }[]>`
            SELECT station_id FROM station_refs WHERE ref = ${ref}
        `;
        const winnerId = existing[0]?.station_id;

        await sql`DELETE FROM stations WHERE id = ${stationId}`;

        if (!winnerId) {
            throw new Error(`Race condition: ref ${ref} disappeared after conflict`);
        }
        return winnerId;
    }

    async addRef(stationId: string, ref: string): Promise<void> {
        const sql = this.db.sql;
        await sql`
            INSERT INTO station_refs (ref, station_id)
            VALUES (${ref}, ${stationId})
            ON CONFLICT DO NOTHING
        `;
    }

    async getAllRefs(): Promise<{ ref: string; stationId: string }[]> {
        const sql = this.db.sql;
        const result = await sql<{ ref: string; station_id: string }[]>`
            SELECT ref, station_id FROM station_refs
        `;
        return result.map(row => ({ ref: row.ref, stationId: row.station_id }));
    }

    watchAll(): Observable<StationModel[]> {
        return new Observable<void>(subscriber => {
            this.db.listen('stations', () => { subscriber.next(); })
                .catch((err: unknown) => { subscriber.error(err); });

            return () => {
                this.db.unlisten('stations').catch(() => { /* cleanup */ });
            };
        }).pipe(
            startWith(void 0),
            switchMap(() => from(this.getStations()))
        );
    }
}
