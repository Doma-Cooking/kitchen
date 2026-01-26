import { Observable, from, startWith, switchMap } from 'rxjs';
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
