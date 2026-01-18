import { CookStatusMessageModel } from "./cookMessageModel.js";

export interface TaskModel {
    id: string;
    input: string | null;
    procedureName: string | null;
    stationId: string | null;
    status: string;
    messages: CookStatusMessageModel[];
    createdAt: string;
    updatedAt: string;
}