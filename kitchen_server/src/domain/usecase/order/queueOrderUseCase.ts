import { OrderRepository } from '../../repository/orderRepository.js';
import { randomUUID } from 'crypto';

export interface QueueOrderUseCase {
    execute(
        recipeId: string,
        orderId?: string,
        name?: string,
        input?: object,
        stationId?: string
    ): Promise<void>;
}

export class QueueOrderUseCaseImpl implements QueueOrderUseCase {
    orderRepository: OrderRepository;

    constructor(orderRepository: OrderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(
        recipeId: string,
        orderId?: string,
        name?: string,
        input?: object,
        stationId?: string
    ): Promise<void> {
        if (!input && !recipeId) {
            throw new Error("An order must have either an input or a recipe ID");
        }

        const id = orderId ?? randomUUID();
        const orderName = name ?? `order-${id}`;

        await this.orderRepository.queueOrder(
            {
                id: id,
                name: orderName,
                input: input,
                recipeId: recipeId,
                stationId: stationId
            }
        );
    }
}
