import { Observable } from "rxjs";
import { StationModel } from "../../model/stationModel.js";
import { OrderModel } from "../../model/orderModel.js";
import { CookMessageModel } from "../../model/cookMessageModel.js";

export interface CookSource {
    executeOrder(order: OrderModel, station: StationModel | null): Observable<CookMessageModel>;
}
