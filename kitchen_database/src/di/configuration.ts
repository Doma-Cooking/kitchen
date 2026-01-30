export interface DatabaseConfiguration {
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
}

export class EnvDatabaseConfiguration implements DatabaseConfiguration {
    readonly dbHost = process.env.DB_HOST ?? 'localhost';
    readonly dbPort = parseInt(process.env.DB_PORT ?? '5432');
    readonly dbUser = process.env.DB_USER ?? 'kitchen';
    readonly dbPassword = process.env.DB_PASSWORD ?? 'kitchen';
    readonly dbName = process.env.DB_NAME ?? 'kitchen';
}
