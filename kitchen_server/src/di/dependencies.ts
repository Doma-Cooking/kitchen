import { CookSource } from '../data/source/cook/cookSource.js';
import { QueueSource } from '../data/source/queue/queueSource.js';
import { GithubSource } from '../data/source/github/githubSource.js';
import { CookRepository, CookRepositoryImpl } from '../domain/repository/cookRepository.js';
import { OrderRepository, OrderRepositoryImpl } from '../domain/repository/orderRepository.js';
import { GithubRepository, GithubRepositoryImpl } from '../domain/repository/githubRepository.js';
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from '../domain/usecase/order/queueOrderUseCase.js';
import { ResolveProjectItemUseCase, ResolveProjectItemUseCaseImpl } from '../domain/usecase/github/resolveProjectItemUseCase.js';
import { ResolvePlanningIssueUseCase, ResolvePlanningIssueUseCaseImpl } from '../domain/usecase/github/resolvePlanningIssueUseCase.js';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { BullQueueSource } from '../data/source/queue/bullQueueSource.js';
import { GraphqlGithubSource } from '../data/source/github/graphqlGithubSource.js';
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

    queueSource: QueueSource;
    cookSource: CookSource;
    githubSource: GithubSource;

    orderRepository: OrderRepository;
    cookRepository: CookRepository;
    githubRepository: GithubRepository;

    queueOrderUseCase: QueueOrderUseCase;
    deleteOrderUseCase: DeleteOrderUseCase;
    watchOrdersUseCase: WatchOrdersUseCase;
    createCookUseCase: CreateCookUseCase;
    resolveProjectItemUseCase: ResolveProjectItemUseCase;
    resolvePlanningIssueUseCase: ResolvePlanningIssueUseCase;

    constructor(
        config?: Configuration,
        cookbook?: Cookbook,
        redis?: Redis,
        queue?: Queue<OrderModel, void>,
        queueEvents?: QueueEvents,
        queueSource?: BullQueueSource,
        cookSource?: CookSource,
        githubSource?: GithubSource,
        orderRepository?: OrderRepository,
        cookRepository?: CookRepository,
        githubRepository?: GithubRepository,
        queueOrderUseCase?: QueueOrderUseCase,
        deleteOrderUseCase?: DeleteOrderUseCase,
        watchOrdersUseCase?: WatchOrdersUseCase,
        createCookUseCase?: CreateCookUseCase,
        resolveProjectItemUseCase?: ResolveProjectItemUseCase,
        resolvePlanningIssueUseCase?: ResolvePlanningIssueUseCase
    ) {
        this.config = config ?? new EnvConfiguration();
        this.cookbook = cookbook ?? domaCookbook;

        const redisConnection = { host: this.config.redisHost, port: this.config.redisPort, maxRetriesPerRequest: null };
        this.redis = redis ?? new Redis(redisConnection);
        this.queue = queue ?? new Queue<OrderModel, void>(this.config.queueName, { connection: redisConnection });
        this.queueEvents = queueEvents ?? new QueueEvents(this.config.queueName, { connection: redisConnection })

        this.queueSource = queueSource ?? new BullQueueSource(this.queue, this.queueEvents, this.redis);
        this.cookSource = cookSource ?? new CookbookCookSource(this.cookbook);
        this.githubSource = githubSource ?? new GraphqlGithubSource(
            this.config.githubAppId,
            this.config.githubPrivateKey,
            this.config.githubInstallationId
        );

        this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.queueSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.queueSource);
        this.githubRepository = githubRepository ?? new GithubRepositoryImpl(this.githubSource);

        this.queueOrderUseCase = queueOrderUseCase ?? new QueueOrderUseCaseImpl(this.orderRepository);
        this.deleteOrderUseCase = deleteOrderUseCase ?? new DeleteOrderUseCaseImpl(this.orderRepository);
        this.watchOrdersUseCase = watchOrdersUseCase ?? new WatchOrdersUseCaseImpl(this.orderRepository);
        this.createCookUseCase = createCookUseCase ?? new CreateCookUseCaseImpl(this.cookRepository);
        this.resolveProjectItemUseCase = resolveProjectItemUseCase ?? new ResolveProjectItemUseCaseImpl(
            this.githubRepository,
            this.config.labelEnabled
        );
        this.resolvePlanningIssueUseCase = resolvePlanningIssueUseCase ?? new ResolvePlanningIssueUseCaseImpl(
            this.githubRepository,
            this.config.labelEnabled,
            this.config.columnPlanning
        );
    }

    async close(): Promise<void> {
        this.redis.disconnect();

        await Promise.all([
            this.queue.close()
        ]);
    }
}
