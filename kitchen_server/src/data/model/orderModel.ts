import { CookStatusMessageModel } from './cookMessageModel.js';

export type OrderStatusModel = 'queued' | 'cooking' | 'succeeded' | 'failed' | 'unknown';

export interface OrderModel {
    id: string;
    name: string;
    input: string | null;
    recipeId: string | null;
    stationId: string | null;
    status: OrderStatusModel;
    messages: CookStatusMessageModel[];
    updatedAt: Date
}
