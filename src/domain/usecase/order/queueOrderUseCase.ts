import { OrderRepository } from '../../repository/orderRepository.js';
import { OrderEntity } from '../../entity/orderEntity.js';
import { randomUUID } from 'crypto';

export interface QueueOrderUseCase {
    execute(order: OrderEntity, queueName: string): Promise<void>;
}

export class QueueOrderUseCaseImpl implements QueueOrderUseCase {
    orderRepository: OrderRepository;

    constructor(orderRepository: OrderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(order: OrderEntity, queueName: string): Promise<void> {
        if (!order.input && !order.recipeId) {
            throw new Error("An order must have either an input or a recipe ID");
        }

        const id = order.id || randomUUID();
        const name = order.name || `order-${id}`;

        await this.orderRepository.queueOrder({
            id,
            name,
            input: order.input,
            recipeId: order.recipeId,
            stationId: order.stationId,
        }, queueName);
    }
}
