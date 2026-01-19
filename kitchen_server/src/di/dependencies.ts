import { CookSource } from "../data/source/cook/cookSource.js";
import { MockCookSource } from "../data/source/cook/mockCookSource.js";
import { MemoryDb } from "../data/source/memoryDb.js";
import { MemoryStationSource } from "../data/source/station/memoryStationSource.js";
import { StationSource } from "../data/source/station/stationSource.js";
import { MemoryOrderSource } from "../data/source/order/memoryOrderSource.js";
import { OrderSource } from "../data/source/order/orderSource.js";
import { CookRepository, CookRepositoryImpl } from "../domain/repository/cookRepository.js";
import { StationRepository, StationRepositoryImpl } from "../domain/repository/stationRepository.js";
import { OrderRepository, OrderRepositoryImpl } from "../domain/repository/orderRepository.js";
import { CleanupStationUseCase, CleanupStationUseCaseImpl } from "../domain/usecase/station/cleanupStationUseCase.js";
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from "../domain/usecase/station/watchStationsUseCase.js";
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from "../domain/usecase/order/queueOrderUseCase.js";
import { WatchOrdersUseCase, WatchOrdersUseCaseImpl } from "../domain/usecase/order/watchOrdersUseCase.js";

export class Dependencies {
    memoryDb: MemoryDb;

    stationSource: StationSource;
    orderSource: OrderSource;
    cookSource: CookSource;

    stationRepository: StationRepository;
    orderRepository: OrderRepository;
    cookRepository: CookRepository;

    queueOrderUseCase: QueueOrderUseCase;
    cleanupStationUseCase: CleanupStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    watchOrdersUseCase: WatchOrdersUseCase;

    constructor(
        memoryDb: MemoryDb | null = null,
        stationSource: StationSource | null = null,
        orderSource: OrderSource | null = null,
        cookSource: CookSource | null = null,
        stationRepository: StationRepository | null = null,
        orderRepository: OrderRepository | null = null,
        cookRepository: CookRepository | null = null,
        queueOrderUseCase: QueueOrderUseCase | null = null,
        cleanupStationUseCase: CleanupStationUseCase | null = null,
        watchStationsUseCase: WatchStationsUseCase | null = null,
        watchOrdersUseCase: WatchOrdersUseCase | null = null
    ) {
        this.memoryDb = memoryDb ?? new MemoryDb();;

        this.stationSource = stationSource ?? new MemoryStationSource(this.memoryDb);
        this.orderSource = orderSource ?? new MemoryOrderSource(this.memoryDb);
        this.cookSource = cookSource ?? new MockCookSource();

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.orderSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.orderRepository, this.stationRepository);

        this.queueOrderUseCase = queueOrderUseCase ?? new QueueOrderUseCaseImpl(this.orderRepository, this.stationRepository, this.cookRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new CleanupStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.watchOrdersUseCase = watchOrdersUseCase ?? new WatchOrdersUseCaseImpl(this.orderRepository);
    }
}
