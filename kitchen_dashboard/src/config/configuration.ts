export class Configuration {
  readonly redisHost: string;
  readonly redisPort: number;
  readonly kitchenQueueName: string;
  readonly dashboardPort: number;
  readonly adminUser: string;
  readonly adminPassword: string;

  constructor() {
    this.redisHost = process.env["REDIS_HOST"] ?? "localhost";
    this.redisPort = parseInt(process.env["REDIS_PORT"] ?? "6379", 10);
    this.kitchenQueueName = process.env["KITCHEN_QUEUE_NAME"] ?? "kitchenQueue";
    this.dashboardPort = parseInt(process.env["DASHBOARD_PORT"] ?? "3001", 10);
    this.adminUser = process.env["ADMIN_USER"] ?? "admin";
    this.adminPassword = process.env["ADMIN_PASSWORD"] ?? "admin";
  }

  get redisConnection() {
    return {
      host: this.redisHost,
      port: this.redisPort,
    };
  }
}
