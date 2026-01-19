import { CookRepository } from "../../repository/cookRepository.js";
import { StationRepository } from "../../repository/stationRepository.js";
import { OrderRepository } from "../../repository/orderRepository.js";

export interface QueueOrderUseCase {
    execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void>;
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

    async execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void> {
        const order = await this.orderRepository.createOrder(input, procedureName, stationId);
        const station = stationId ? await this.stationRepository.getStationById(stationId) ?? await this.stationRepository.createStation(stationId) : null;

        // TODO: Rather than executing immediately, add to a queue system.
        await this.cookRepository.executeOrder(order, station);
    }
}
