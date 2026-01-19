import { concatMap, lastValueFrom, map } from "rxjs";
import { StationEntity, toStationModel } from "../entity/stationEntity.js";
import { OrderEntity, OrderStatus, toOrderModel } from "../entity/orderEntity.js";
import { toCookMessageEntity } from "../entity/cookMessageEntity.js";
import { CookSource } from "../../data/source/cook/cookSource.js";
import { StationRepository } from "./stationRepository.js";
import { OrderRepository } from "./orderRepository.js";

export interface CookRepository {
    executeOrder(order: OrderEntity, station: StationEntity | null): Promise<void>;
}

export class CookRepositoryImpl implements CookRepository {
    private source: CookSource;
    private orderRepository: OrderRepository;
    private stationRepository: StationRepository;

    constructor(
        source: CookSource,
        orderRepository: OrderRepository,
        stationRepository: StationRepository
    ) {
        this.source = source;
        this.orderRepository = orderRepository;
        this.stationRepository = stationRepository;
    }

    async executeOrder(order: OrderEntity, station: StationEntity | null): Promise<void> {
        await this.orderRepository.updateOrderStatus(order.id, OrderStatus.InProgress);

        try {
            await lastValueFrom(
                this.source.executeOrder(
                    toOrderModel(order),
                    station ? toStationModel(station) : null,
                ).pipe(
                    map(model => toCookMessageEntity(model)),
                    concatMap((message) => {
                        switch (message.type) {
                            case 'status':
                                return this.orderRepository.addMessageToOrder(order.id, message);
                            case 'station':
                                return this.stationRepository.updateStation(message.station);
                        }
                    }),
                )
            );
            await this.orderRepository.updateOrderStatus(order.id, OrderStatus.Completed);
        } catch (err) {
            await this.orderRepository.updateOrderStatus(order.id, OrderStatus.Failed);
            throw err;
        }
    }
}
