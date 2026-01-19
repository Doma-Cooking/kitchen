import { Observable } from "rxjs";
import { OrderEntity } from "../../entity/orderEntity.js";
import { OrderRepository } from "../../repository/orderRepository.js";

export interface WatchOrdersUseCase {
    execute(): Observable<OrderEntity[]>;
}

export class WatchOrdersUseCaseImpl implements WatchOrdersUseCase {
    private orderRepository: OrderRepository;

    constructor(orderRepository: OrderRepository) {
        this.orderRepository = orderRepository;
    }

    execute(): Observable<OrderEntity[]> {
        return this.orderRepository.watchAll();
    }
}
