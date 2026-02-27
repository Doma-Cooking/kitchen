import { CookSource } from '../data/source/cook/cookSource.js';
import { QueueSource } from '../data/source/queue/queueSource.js';
import { GithubSource } from '../data/source/github/githubSource.js';
import { StationSource } from '../data/source/station/stationSource.js';
import { CookRepository, CookRepositoryImpl } from '../domain/repository/cookRepository.js';
import { OrderRepository, OrderRepositoryImpl } from '../domain/repository/orderRepository.js';
import { GithubRepository, GithubRepositoryImpl } from '../domain/repository/githubRepository.js';
import { StationRepository, StationRepositoryImpl } from '../domain/repository/stationRepository.js';
import { QueueOrderUseCase, QueueOrderUseCaseImpl } from '../domain/usecase/order/queueOrderUseCase.js';
import { ResolvePlanningIssueUseCase, ResolvePlanningIssueUseCaseImpl } from '../domain/usecase/order/resolve/resolvePlanningIssueUseCase.js';
import { ResolveImplementingIssueUseCase, ResolveImplementingIssueUseCaseImpl } from '../domain/usecase/order/resolve/resolveImplementingIssueUseCase.js';
import { ResolveSlackContextUseCase, ResolveSlackContextUseCaseImpl } from '../domain/usecase/order/resolve/resolveSlackContextUseCase.js';
import { GetStationByIdUseCase, GetStationByIdUseCaseImpl } from '../domain/usecase/station/getStationByIdUseCase.js';
import { CreateStationUseCase, CreateStationUseCaseImpl } from '../domain/usecase/station/createStationUseCase.js';
import { UpdateStationUseCase, UpdateStationUseCaseImpl } from '../domain/usecase/station/updateStationUseCase.js';
import { DeleteStationUseCase, DeleteStationUseCaseImpl } from '../domain/usecase/station/deleteStationUseCase.js';
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from '../domain/usecase/station/watchStationsUseCase.js';
import { Redis } from 'ioredis';
import { BullQueueSource } from '../data/source/queue/bullQueueSource.js';
import { GraphqlGithubSource } from '../data/source/github/graphqlGithubSource.js';
import { PostgresStationSource } from '../data/source/station/postgresStationSource.js';
import { PostgresDb } from '../data/source/database/postgresDb.js';
import { WatchOrdersUseCase, WatchOrdersUseCaseImpl } from '../domain/usecase/order/watchOrdersUseCase.js';
import { Configuration, KitchenConfiguration } from './configuration.js';
import { GetConfigurationUseCase, GetConfigurationUseCaseImpl } from '../domain/usecase/config/getConfigurationUseCase.js';
import { GetRepoConfigUseCase, GetRepoConfigUseCaseImpl } from '../domain/usecase/config/getRepoConfigUseCase.js';
import { DeleteOrderUseCase, DeleteOrderUseCaseImpl } from '../domain/usecase/order/deleteOrderUseCase.js';
import { CreateCookUseCase, CreateCookUseCaseImpl } from '../domain/usecase/cook/createCookUseCase.js';
import { CreateCooksUseCase, CreateCooksUseCaseImpl } from '../domain/usecase/cook/createCooksUseCase.js';
import type { Cookbook } from '../cookbook/interface/cookbook.js';
import { CookbookCookSource } from '../data/source/cook/cookbookCookSource.js';
import { domaCookbook } from '../cookbook/implementation/cookbook/domaCookbook.js';

export class Dependencies {
  config: Configuration;
  cookbook: Cookbook;

  postgresDb: PostgresDb;
  redis: Redis;

  queueSource: QueueSource;
  cookSource: CookSource;
  githubSource: GithubSource;
  stationSource: StationSource;

  orderRepository: OrderRepository;
  cookRepository: CookRepository;
  githubRepository: GithubRepository;
  stationRepository: StationRepository;

  getConfigurationUseCase: GetConfigurationUseCase;
  getRepoConfigUseCase: GetRepoConfigUseCase;
  queueOrderUseCase: QueueOrderUseCase;
  deleteOrderUseCase: DeleteOrderUseCase;
  watchOrdersUseCase: WatchOrdersUseCase;
  createCookUseCase: CreateCookUseCase;
  createCooksUseCase: CreateCooksUseCase;
  resolvePlanningIssueUseCase: ResolvePlanningIssueUseCase;
  resolveImplementingIssueUseCase: ResolveImplementingIssueUseCase;
  resolveSlackContextUseCase: ResolveSlackContextUseCase;
  getStationByIdUseCase: GetStationByIdUseCase;
  createStationUseCase: CreateStationUseCase;
  updateStationUseCase: UpdateStationUseCase;
  deleteStationUseCase: DeleteStationUseCase;
  watchStationsUseCase: WatchStationsUseCase;

  constructor(
    config?: Configuration,
    cookbook?: Cookbook,
    postgresDb?: PostgresDb,
    redis?: Redis,
    queueSource?: QueueSource,
    cookSource?: CookSource,
    githubSource?: GithubSource,
    stationSource?: StationSource,
    orderRepository?: OrderRepository,
    cookRepository?: CookRepository,
    githubRepository?: GithubRepository,
    stationRepository?: StationRepository,
    getConfigurationUseCase?: GetConfigurationUseCase,
    getRepoConfigUseCase?: GetRepoConfigUseCase,
    queueOrderUseCase?: QueueOrderUseCase,
    deleteOrderUseCase?: DeleteOrderUseCase,
    watchOrdersUseCase?: WatchOrdersUseCase,
    createCookUseCase?: CreateCookUseCase,
    createCooksUseCase?: CreateCooksUseCase,
    resolvePlanningIssueUseCase?: ResolvePlanningIssueUseCase,
    resolveImplementingIssueUseCase?: ResolveImplementingIssueUseCase,
    resolveSlackContextUseCase?: ResolveSlackContextUseCase,
    getStationByIdUseCase?: GetStationByIdUseCase,
    createStationUseCase?: CreateStationUseCase,
    updateStationUseCase?: UpdateStationUseCase,
    deleteStationUseCase?: DeleteStationUseCase,
    watchStationsUseCase?: WatchStationsUseCase
  ) {
    this.config = config ?? new KitchenConfiguration();
    this.cookbook = cookbook ?? domaCookbook;

    this.postgresDb = postgresDb ?? new PostgresDb(`postgres://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort.toString()}/${this.config.dbName}`);

    const redisConnection = { host: this.config.redisHost, port: this.config.redisPort, maxRetriesPerRequest: null };
    this.redis = redis ?? new Redis(redisConnection);

    this.queueSource = queueSource ?? new BullQueueSource(
      [this.config.eventQueue.name, this.config.orderQueue.name],
      this.redis,
      redisConnection
    );
    this.cookSource = cookSource ?? new CookbookCookSource(this.cookbook, this.config);
    this.githubSource = githubSource ?? new GraphqlGithubSource(
      this.config.githubAppId,
      this.config.githubPrivateKey,
      this.config.githubInstallationId
    );
    this.stationSource = stationSource ?? new PostgresStationSource(this.postgresDb);

    this.orderRepository = orderRepository ?? new OrderRepositoryImpl(this.queueSource);
    this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.queueSource);
    this.githubRepository = githubRepository ?? new GithubRepositoryImpl(this.githubSource);
    this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);

    this.getConfigurationUseCase = getConfigurationUseCase ?? new GetConfigurationUseCaseImpl(this.config);
    this.getRepoConfigUseCase = getRepoConfigUseCase ?? new GetRepoConfigUseCaseImpl(this.getConfigurationUseCase);
    this.queueOrderUseCase = queueOrderUseCase ?? new QueueOrderUseCaseImpl(this.orderRepository);
    this.deleteOrderUseCase = deleteOrderUseCase ?? new DeleteOrderUseCaseImpl(this.orderRepository);
    this.watchOrdersUseCase = watchOrdersUseCase ?? new WatchOrdersUseCaseImpl(this.orderRepository);
    this.createCookUseCase = createCookUseCase ?? new CreateCookUseCaseImpl(this.cookRepository);
    this.createCooksUseCase = createCooksUseCase ?? new CreateCooksUseCaseImpl(this.createCookUseCase);
    this.resolvePlanningIssueUseCase = resolvePlanningIssueUseCase ?? new ResolvePlanningIssueUseCaseImpl(
      this.githubRepository,
      this.config.labelEnabled,
      this.config.columnPlanning
    );
    this.resolveImplementingIssueUseCase = resolveImplementingIssueUseCase ?? new ResolveImplementingIssueUseCaseImpl(
      this.githubRepository,
      this.config.labelEnabled,
      this.config.columnImplementing
    );

    this.resolveSlackContextUseCase = resolveSlackContextUseCase ?? new ResolveSlackContextUseCaseImpl(
      this.config.slackBotToken
    );

    this.getStationByIdUseCase = getStationByIdUseCase ?? new GetStationByIdUseCaseImpl(this.stationRepository);
    this.createStationUseCase = createStationUseCase ?? new CreateStationUseCaseImpl(this.stationRepository);
    this.updateStationUseCase = updateStationUseCase ?? new UpdateStationUseCaseImpl(this.stationRepository);
    this.deleteStationUseCase = deleteStationUseCase ?? new DeleteStationUseCaseImpl(this.stationRepository);
    this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
  }

  async close(): Promise<void> {
    this.redis.disconnect();

    await Promise.all([
      this.queueSource.dispose(),
      this.postgresDb.close(),
    ]);
  }
}
