import { PostgresDb } from '../postgresDb.js';
import { DatabaseConfiguration, EnvDatabaseConfiguration } from './configuration.js';

export class DatabaseDependencies {
    config: DatabaseConfiguration;
    postgresDb: PostgresDb;

    constructor(config?: DatabaseConfiguration, postgresDb?: PostgresDb) {
        this.config = config ?? new EnvDatabaseConfiguration();
        this.postgresDb = postgresDb ?? new PostgresDb(`postgres://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort.toString()}/${this.config.dbName}`);
    }

    async close(): Promise<void> {
        await this.postgresDb.close();
    }
}

export const databaseDependencies = new DatabaseDependencies();
