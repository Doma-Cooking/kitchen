import { Observable, from, startWith, switchMap } from "rxjs";
import { OrderModel } from "../../model/orderModel.js";
import { OrderSource } from "./orderSource.js";
import { CookStatusMessageModel } from "../../model/cookMessageModel.js";
import { PostgresDb } from "../../../db/postgres/postgresDb.js";
import { randomUUID } from "crypto";

interface OrderRow {
    id: string;
    input: string | null;
    procedure_name: string | null;
    station_id: string | null;
    status: string;
    messages: CookStatusMessageModel[];
    created_at: Date;
    updated_at: Date;
}

function rowToModel(row: OrderRow): OrderModel {
    return {
        id: row.id,
        input: row.input,
        procedureName: row.procedure_name,
        stationId: row.station_id,
        status: row.status,
        messages: row.messages,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export class PostgresOrderSource implements OrderSource {
    private db: PostgresDb;

    constructor(db: PostgresDb) {
        this.db = db;
    }

    async createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderModel> {
        const id = randomUUID();
        const sql = this.db.sql;
        const result = await sql<OrderRow[]>`
            INSERT INTO orders (id, input, procedure_name, station_id, status, messages)
            VALUES (${id}, ${input}, ${procedureName}, ${stationId}, 'Pending', '[]'::jsonb)
            RETURNING *
        `;
        const row = result[0];
        if (!row) {
            throw new Error('Failed to create order');
        }
        return rowToModel(row);
    }

    async getOrders(): Promise<OrderModel[]> {
        const sql = this.db.sql;
        const result = await sql<OrderRow[]>`
            SELECT * FROM orders
        `;
        return result.map(rowToModel);
    }

    async getOrderById(orderId: string): Promise<OrderModel | null> {
        const sql = this.db.sql;
        const result = await sql<OrderRow[]>`
            SELECT * FROM orders WHERE id = ${orderId}
        `;
        const row = result[0];
        if (!row) {
            return null;
        }
        return rowToModel(row);
    }

    async addMessageToOrder(orderId: string, message: CookStatusMessageModel): Promise<void> {
        const sql = this.db.sql;
        const result = await sql<{ id: string }[]>`
            UPDATE orders
            SET messages = messages || ${sql.json([message])}::jsonb
            WHERE id = ${orderId}
            RETURNING id
        `;
        if (result.length === 0) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        const sql = this.db.sql;
        const result = await sql<{ id: string }[]>`
            UPDATE orders SET status = ${status} WHERE id = ${orderId} RETURNING id
        `;
        if (result.length === 0) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
    }

    async deleteOrder(orderId: string): Promise<void> {
        const sql = this.db.sql;
        await sql`DELETE FROM orders WHERE id = ${orderId}`;
    }

    watchAll(): Observable<OrderModel[]> {
        return new Observable<void>(subscriber => {
            this.db.listen('orders', () => { subscriber.next(); })
                .catch((err: unknown) => { subscriber.error(err); });

            return () => {
                this.db.unlisten('orders').catch(() => { /* cleanup */ });
            };
        }).pipe(
            startWith(void 0),
            switchMap(() => from(this.getOrders()))
        );
    }
}
