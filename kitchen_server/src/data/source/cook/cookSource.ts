import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { OrderModel } from '../../model/orderModel.js';

export interface CookSource {
    executeOrder(order: OrderModel, signal?: AbortSignal): Observable<CookMessageModel>;
}
