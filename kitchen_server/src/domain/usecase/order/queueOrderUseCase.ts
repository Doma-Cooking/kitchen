import { CookRepository } from '../../repository/cookRepository.js';
import { StationRepository } from 'kitchen_station';
import { OrderRepository } from '../../repository/orderRepository.js';
import { randomUUID } from 'crypto';

export interface QueueOrderUseCase {
    execute(
        id: string | null,
        name: string | null,
        input: string | null,
        recipeId: string | null,
        stationId: string | null
    ): Promise<void>;
}

export class QueueOrderUseCaseImpl implements QueueOrderUseCase {
    orderRepository: OrderRepository;
    stationRepository: StationRepository;
    cookRepository: CookRepository;

    constructor(
        orderRepository: OrderRepository,
        stationRepository: StationRepository,
        cookRepository: CookRepository
    ) {
        this.orderRepository = orderRepository;
        this.stationRepository = stationRepository;
        this.cookRepository = cookRepository;
    }

    async execute(
        id: string | null,
        name: string | null,
        input: string | null,
        recipeId: string | null,
        stationId: string | null
    ): Promise<void> {
        if (!input && !recipeId) {
            throw new Error("An order must have either an input or a recipe ID");
        }

        const orderId = id ?? randomUUID();
        const orderName = name ?? `order-${orderId}`;

        await this.orderRepository.queueOrder(
            {
                id: orderId,
                name: orderName,
                input: input,
                recipeId: recipeId,
                stationId: stationId
            }
        );
    }
}
