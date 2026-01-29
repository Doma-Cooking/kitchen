import { CookSource } from '../data/source/cook/cookSource.js';
import { PostgresDb } from 'kitchen_database';
import { QueueSource } from '../data/source/queue/queueSource.js';
import { CookRepository, CookRepositoryImpl } from '../domain/repository/cookRepository.js';
import { OrderRepository, OrderRepositoryImpl } from '../domain/repository/orderRepository.js';
import {
    StationSource,
    PostgresStationSource,
    StationRepository,
    StationRepositoryImpl,
    DeleteStationUseCase,
    DeleteStationUseCaseImpl,
    WatchStationsUseCase,
    WatchStationsUseCaseImpl,
} from 'kitchen_station';
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from '../domain/usecase/order/queueOrderUseCase.js';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { BullQueueSource } from '../data/source/queue/bullQueueSource.js';
import { OrderModel } from '../data/model/orderModel.js';
import { WatchOrdersUseCase, WatchOrdersUseCaseImpl } from '../domain/usecase/order/watchOrdersUseCase.js';
import { Configuration, EnvConfiguration } from './configuration.js';
import { DeleteOrderUseCase, DeleteOrderUseCaseImpl } from '../domain/usecase/order/deleteOrderUseCase.js';
import { CreateCookUseCase, CreateCookUseCaseImpl } from '../domain/usecase/cook/createCookUseCase.js';
import { Cookbook } from '../../../kitchen_cookbook/dist/interface/cookbook.js';
import { CookbookCookSource } from '../data/source/cook/cookbookCookSource.js';
import { domaCookbook } from 'kitchen_cookbook';

export class Dependencies {
    config: Configuration;
    cookbook: Cookbook;

    redis: Redis;
    queue: Queue<OrderModel, void>;
    queueEvents: QueueEvents;
    postgresDb: PostgresDb;

    stationSource: StationSource;
    queueSource: QueueSource;
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
        config?: Configuration,
        cookbook?: Cookbook,
        redis?: Redis,
        queue?: Queue<OrderModel, void>,
        queueEvents?: QueueEvents,
        postgresDb?: PostgresDb,
        stationSource?: PostgresStationSource,
        queueSource?: BullQueueSource,
        cookSource?: CookSource,
        stationRepository?: StationRepository,
        orderRepository?: OrderRepository,
        cookRepository?: CookRepository,
        queueOrderUseCase?: QueueOrderUseCase,
        deleteOrderUseCase?: DeleteOrderUseCase,
        cleanupStationUseCase?: DeleteStationUseCase,
        watchStationsUseCase?: WatchStationsUseCase,
        watchOrdersUseCase?: WatchOrdersUseCase,
        createCookUseCase?: CreateCookUseCase
    ) {
        this.config = config ?? new EnvConfiguration();
        this.cookbook = cookbook ?? domaCookbook;

        const redisConnection = { host: this.config.redisHost, port: this.config.redisPort, maxRetriesPerRequest: null };
        this.redis = redis ?? new Redis(redisConnection);
        this.queue = queue ?? new Queue<OrderModel, void>(this.config.queueName, { connection: redisConnection });
        this.queueEvents = queueEvents ?? new QueueEvents(this.config.queueName, { connection: redisConnection })
        this.postgresDb = postgresDb ?? new PostgresDb(`postgres://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort.toString()}/${this.config.dbName}`);

        this.stationSource = stationSource ?? new PostgresStationSource(this.postgresDb);
        this.queueSource = queueSource ?? new BullQueueSource(this.queue, this.queueEvents, this.redis);
        this.cookSource = cookSource ?? new CookbookCookSource(this.cookbook);

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.queueSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.queueSource);

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
