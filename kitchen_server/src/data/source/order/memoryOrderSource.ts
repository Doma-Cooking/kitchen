import { map, Observable } from "rxjs";
import { OrderModel } from "../../model/orderModel.js";
import { OrderSource } from "./orderSource.js";
import { CookStatusMessageModel } from "../../model/cookMessageModel.js";
import { MemoryDb } from "../../../db/memory/memoryDb.js";

const _memoryDelayMs = 100;

export class MemoryOrderSource implements OrderSource {
    private db: MemoryDb;
    private nextId = 0;

    constructor(db: MemoryDb) {
        this.db = db;
    }

    async createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderModel> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const order: OrderModel = {
            id: `order-${String(this.nextId++)}`,
            input,
            procedureName,
            stationId,
            status: 'Pending',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const updatedOrders = new Map(this.db.orders.value);
        updatedOrders.set(order.id, order);
        this.db.orders.next(updatedOrders);
        return order;
    }

    async getOrders(): Promise<OrderModel[]> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return Array.from(this.db.orders.value.values());
    }

    async getOrderById(orderId: string): Promise<OrderModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return this.db.orders.value.get(orderId) ?? null;
    }

    async addMessageToOrder(orderId: string, message: CookStatusMessageModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const order = this.db.orders.value.get(orderId);
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        const updatedOrder = Object.assign({}, order, { messages: [...order.messages, message], updatedAt: new Date().toISOString() });
        const updatedOrders = new Map(this.db.orders.value);
        updatedOrders.set(order.id, updatedOrder);
        this.db.orders.next(updatedOrders);
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const order = this.db.orders.value.get(orderId);
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        const updatedOrder = Object.assign({}, order, { status, updatedAt: new Date().toISOString() });
        const updatedOrders = new Map(this.db.orders.value);
        updatedOrders.set(order.id, updatedOrder);
        this.db.orders.next(updatedOrders);
    }

    async deleteOrder(orderId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const updatedOrders = new Map(this.db.orders.value);
        updatedOrders.delete(orderId);
        this.db.orders.next(updatedOrders);
    }

    watchAll(): Observable<OrderModel[]> {
        return this.db.orders.pipe(map(orders => Array.from(orders.values())));
    }
}
