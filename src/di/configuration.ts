export interface Configuration {
    redisHost: string;
    redisPort: number;
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    queueName: string;
    githubWebhookSecret: string;
    githubAppId: string;
    githubPrivateKey: string;
    githubInstallationId: string;
    columnPlanning: string;
    columnImplementing: string;
    columnReady: string;
    labelEnabled: string;
    adminUser: string;
    adminPassword: string;
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
    readonly githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
    readonly githubAppId = process.env.GITHUB_APP_ID ?? '';
    readonly githubPrivateKey = process.env.GITHUB_PRIVATE_KEY ?? '';
    readonly githubInstallationId = process.env.GITHUB_INSTALLATION_ID ?? '';
    readonly columnPlanning = process.env.KITCHEN_COLUMN_PLANNING ?? 'Planning';
    readonly columnImplementing = process.env.KITCHEN_COLUMN_IMPLEMENTING ?? 'In Progress';
    readonly columnReady = process.env.KITCHEN_COLUMN_READY ?? 'Ready';
    readonly labelEnabled = process.env.KITCHEN_LABEL_ENABLED ?? 'agent:enabled';
    readonly adminUser = process.env.ADMIN_USER ?? 'admin';
    readonly adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
}
