import { CookSource } from '../data/source/cook/cookSource.js';
import { MockCookSource } from '../data/source/cook/mockCookSource.js';
import { PostgresDb } from '../db/postgres/postgresDb.js';
import { PostgresStationSource } from '../data/source/station/postgresStationSource.js';
import { StationSource } from '../data/source/station/stationSource.js';
import { OrderSource } from '../data/source/order/orderSource.js';
import { CookRepository, CookRepositoryImpl } from '../domain/repository/cookRepository.js';
import { StationRepository, StationRepositoryImpl } from '../domain/repository/stationRepository.js';
import { OrderRepository, OrderRepositoryImpl } from '../domain/repository/orderRepository.js';
import { DeleteStationUseCase, DeleteStationUseCaseImpl } from '../domain/usecase/station/deleteStationUseCase.js';
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from '../domain/usecase/station/watchStationsUseCase.js';
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from '../domain/usecase/order/queueOrderUseCase.js';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { BullOrderSource } from '../data/source/order/bullOrderSource.js';
import { OrderModel } from '../data/model/orderModel.js';
import { WatchOrdersUseCase, WatchOrdersUseCaseImpl } from '../domain/usecase/order/watchOrdersUseCase.js';
import { Configuration, EnvConfiguration } from './configuration.js';
import { DeleteOrderUseCase, DeleteOrderUseCaseImpl } from '../domain/usecase/order/deleteOrderUseCase.js';
import { CreateCookUseCase, CreateCookUseCaseImpl } from '../domain/usecase/cook/createCookUseCase.js';

export class Dependencies {
    config: Configuration;

    redis: Redis;
    queue: Queue<OrderModel, void>;
    queueEvents: QueueEvents;
    postgresDb: PostgresDb;

    stationSource: StationSource;
    orderSource: OrderSource;
    cookSource: CookSource;

    stationRepository: StationRepository;
    orderRepository: OrderRepository;
    cookRepository: CookRepository;

    queueOrderUseCase: QueueOrderUseCase;
    deleteOrderUseCase: DeleteOrderUseCase;
    cleanupStationUseCase: DeleteStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    watchOrdersUseCase: WatchOrdersUseCase;
    createCookUseCase: CreateCookUseCase;

    constructor(
        config: Configuration | null = null,
        redis: Redis | null = null,
        queue: Queue<OrderModel, void> | null = null,
        queueEvents: QueueEvents | null = null,
        postgresDb: PostgresDb | null = null,
        stationSource: PostgresStationSource | null = null,
        orderSource: BullOrderSource | null = null,
        cookSource: CookSource | null = null,
        stationRepository: StationRepository | null = null,
        orderRepository: OrderRepository | null = null,
        cookRepository: CookRepository | null = null,
        queueOrderUseCase: QueueOrderUseCase | null = null,
        deleteOrderUseCase: DeleteOrderUseCase | null = null,
        cleanupStationUseCase: DeleteStationUseCase | null = null,
        watchStationsUseCase: WatchStationsUseCase | null = null,
        watchOrdersUseCase: WatchOrdersUseCase | null = null,
        createCookUseCase: CreateCookUseCase | null = null
    ) {
        this.config = config ?? new EnvConfiguration();

        const redisConnection = { host: this.config.redisHost, port: this.config.redisPort, maxRetriesPerRequest: null };
        this.redis = redis ?? new Redis(redisConnection);
        this.queue = queue ?? new Queue<OrderModel, void>(this.config.queueName, { connection: redisConnection });
        this.queueEvents = queueEvents ?? new QueueEvents(this.config.queueName, { connection: redisConnection })
        this.postgresDb = postgresDb ?? new PostgresDb(`postgres://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort.toString()}/${this.config.dbName}`);

        this.stationSource = stationSource ?? new PostgresStationSource(this.postgresDb);
        this.orderSource = orderSource ?? new BullOrderSource(this.queue, this.queueEvents, this.redis);
        this.cookSource = cookSource ?? new MockCookSource();

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.orderSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.orderSource, this.stationRepository);

        this.queueOrderUseCase = queueOrderUseCase ?? new QueueOrderUseCaseImpl(this.orderRepository, this.stationRepository, this.cookRepository);
        this.deleteOrderUseCase = deleteOrderUseCase ?? new DeleteOrderUseCaseImpl(this.orderRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new DeleteStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.watchOrdersUseCase = watchOrdersUseCase ?? new WatchOrdersUseCaseImpl(this.orderRepository);
        this.createCookUseCase = createCookUseCase ?? new CreateCookUseCaseImpl(this.cookRepository);
    }

    async close(): Promise<void> {
        this.redis.disconnect();

        await Promise.all([
            this.postgresDb.close(),
            this.queue.close(),
        ]);
    }
}
