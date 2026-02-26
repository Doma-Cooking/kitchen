import { Observable } from "rxjs";
import { OrderEntity } from "../../entity/orderEntity.js";
import { OrderRepository } from "../../repository/orderRepository.js";

export interface WatchOrdersUseCase {
    execute(queueName: string): Observable<OrderEntity[]>;
}

export class WatchOrdersUseCaseImpl implements WatchOrdersUseCase {
    private orderRepository: OrderRepository;

    constructor(orderRepository: OrderRepository) {
        this.orderRepository = orderRepository;
    }

    // TODO: Update this to watch a Job Entity, which should include as order as well as its messages and status.
    execute(queueName: string): Observable<OrderEntity[]> {
        return this.orderRepository.watchAll(queueName);
    }
}
