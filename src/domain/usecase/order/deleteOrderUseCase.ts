import { OrderRepository } from "../../repository/orderRepository.js";

export interface DeleteOrderUseCase {
    execute(orderId: string, queueName: string): Promise<void>;
}

export class DeleteOrderUseCaseImpl implements DeleteOrderUseCase {
    orderRepository: OrderRepository;

    constructor(orderRepository: OrderRepository) {
        this.orderRepository = orderRepository;
    }

    async execute(orderId: string, queueName: string): Promise<void> {
        await this.orderRepository.deleteOrder(orderId, queueName);
    }
}
