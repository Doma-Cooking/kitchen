import { Observable } from "rxjs";
import { OrderModel } from "../../model/orderModel.js";
import { CookStatusMessageModel } from "../../model/cookMessageModel.js";

export interface OrderSource {
    createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderModel>;
    getOrders(): Promise<OrderModel[]>;
    getOrderById(orderId: string): Promise<OrderModel | null>;
    addMessageToOrder(orderId: string, message: CookStatusMessageModel): Promise<void>;
    updateOrderStatus(orderId: string, status: string): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    watchAll(): Observable<OrderModel[]>;
}
