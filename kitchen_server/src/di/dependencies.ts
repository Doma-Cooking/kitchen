import { CookSource } from "../data/source/cook/cookSource.js";
import { MockCookSource } from "../data/source/cook/mockCookSource.js";
import { PostgresDb } from "../db/postgres/postgresDb.js";
import { PostgresStationSource } from "../data/source/station/postgresStationSource.js";
import { StationSource } from "../data/source/station/stationSource.js";
import { PostgresOrderSource } from "../data/source/order/postgresOrderSource.js";
import { OrderSource } from "../data/source/order/orderSource.js";
import { CookRepository, CookRepositoryImpl } from "../domain/repository/cookRepository.js";
import { StationRepository, StationRepositoryImpl } from "../domain/repository/stationRepository.js";
import { OrderRepository, OrderRepositoryImpl } from "../domain/repository/orderRepository.js";
import { DeleteStationUseCase, DeleteStationUseCaseImpl } from "../domain/usecase/station/deleteStationUseCase.js";
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from "../domain/usecase/station/watchStationsUseCase.js";
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from "../domain/usecase/order/queueOrderUseCase.js";
import { WatchOrdersUseCase, WatchOrdersUseCaseImpl } from "../domain/usecase/order/watchOrdersUseCase.js";
import { DeleteOrderUseCase, DeleteOrderUseCaseImpl } from "../domain/usecase/order/deleteOrderUseCase.js";

export class Dependencies {
    postgresDb: PostgresDb;

    stationSource: StationSource;
    orderSource: OrderSource;
    cookSource: CookSource;

    stationRepository: StationRepository;
    orderRepository: OrderRepository;
    cookRepository: CookRepository;

    queueOrderUseCase: QueueOrderUseCase;
    cleanupStationUseCase: DeleteStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    watchOrdersUseCase: WatchOrdersUseCase;
    deleteOrderUseCase: DeleteOrderUseCase;

    constructor(
        postgresDb: PostgresDb | null = null,
        stationSource: PostgresStationSource | null = null,
        orderSource: PostgresOrderSource | null = null,
        cookSource: CookSource | null = null,
        stationRepository: StationRepository | null = null,
        orderRepository: OrderRepository | null = null,
        cookRepository: CookRepository | null = null,
        queueOrderUseCase: QueueOrderUseCase | null = null,
        cleanupStationUseCase: DeleteStationUseCase | null = null,
        watchStationsUseCase: WatchStationsUseCase | null = null,
        watchOrdersUseCase: WatchOrdersUseCase | null = null,
        deleteOrderUseCase: DeleteOrderUseCase | null = null
    ) {
        this.postgresDb = postgresDb ?? new PostgresDb(process.env.DATABASE_URL ?? '');

        this.stationSource = stationSource ?? new PostgresStationSource(this.postgresDb);
        this.orderSource = orderSource ?? new PostgresOrderSource(this.postgresDb);
        this.cookSource = cookSource ?? new MockCookSource();

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.orderSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.orderRepository, this.stationRepository);

        this.queueOrderUseCase = queueOrderUseCase ?? new QueueOrderUseCaseImpl(this.orderRepository, this.stationRepository, this.cookRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new DeleteStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.watchOrdersUseCase = watchOrdersUseCase ?? new WatchOrdersUseCaseImpl(this.orderRepository);
        this.deleteOrderUseCase = deleteOrderUseCase ?? new DeleteOrderUseCaseImpl(this.orderRepository);
    }

    async initialize(): Promise<void> {
        await this.orderRepository.initialize();
        await this.stationRepository.initialize();
    }

    async close(): Promise<void> {
        await this.postgresDb.close();
    }
}
