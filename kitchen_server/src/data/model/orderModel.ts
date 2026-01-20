import { CookStatusMessageModel } from "./cookMessageModel.js";

export interface OrderModel {
    id: string;
    input: string | null;
    procedureName: string | null;
    stationId: string | null;
    status: string;
    messages: CookStatusMessageModel[];
    createdAt: Date;
    updatedAt: Date;
}
