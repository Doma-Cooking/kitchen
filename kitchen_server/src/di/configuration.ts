export interface Configuration {
    redisHost: string;
    redisPort: number;
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    queueName: string;
}

export class EnvConfiguration implements Configuration {
    readonly redisHost = process.env.REDIS_HOST ?? 'localhost';
    readonly redisPort = parseInt(process.env.REDIS_PORT ?? '6379');
    readonly dbHost = process.env.DB_HOST ?? 'localhost';
    readonly dbPort = parseInt(process.env.DB_PORT ?? '5432');
    readonly dbUser = process.env.DB_USER ?? 'kitchen';
    readonly dbPassword = process.env.DB_PASSWORD ?? 'kitchen';
    readonly dbName = process.env.DB_NAME ?? 'kitchen';
    readonly queueName = process.env.KITCHEN_QUEUE_NAME ?? 'kitchenQueue';
}
