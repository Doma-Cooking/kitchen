import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export interface Configuration {
  // Server
  port: number;

  // Redis
  redisHost: string;
  redisPort: number;

  // Database
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;

  // Queue
  queueName: string;

  // GitHub
  githubWebhookSecret: string;
  githubAppId: string;
  githubAppSlug: string;
  githubPrivateKey: string;
  githubInstallationId: string;

  // GitHub project columns
  columnPlanning: string;
  columnImplementing: string;
  columnReady: string;
  labelEnabled: string;

  // Repository
  repoUrl: string;
  clonePath: string;
  mainBranch: string;

  // Claude
  claudeCodeOAuthToken: string;

  // Slack
  slackBotToken: string;
  slackChannelId: string;

  // Flutter
  flutterChannel: string;
  flutterHome: string;

  // Admin
  adminUser: string;
  adminPassword: string;
}

// --- Secrets from environment variables (.env) ---

class EnvConfiguration {
  get githubWebhookSecret() { return process.env.GITHUB_WEBHOOK_SECRET ?? ''; }
  get githubAppId() { return process.env.GITHUB_APP_ID ?? ''; }
  get githubPrivateKey() { return process.env.GITHUB_PRIVATE_KEY ?? ''; }
  get githubInstallationId() { return process.env.GITHUB_INSTALLATION_ID ?? ''; }
  get claudeCodeOAuthToken() { return process.env.CLAUDE_CODE_OAUTH_TOKEN ?? ''; }
  get slackBotToken() { return process.env.SLACK_BOT_TOKEN ?? ''; }
  get dbPassword() { return process.env.DB_PASSWORD ?? 'kitchen'; }
  get adminUser() { return process.env.ADMIN_USER ?? 'admin'; }
  get adminPassword() { return process.env.ADMIN_PASSWORD ?? 'admin'; }
}

// --- Non-sensitive settings from .kitchen.yaml ---

interface YamlSchema {
  port?: number;
  redis?: { host?: string; port?: number };
  db?: { host?: string; port?: number; user?: string; name?: string };
  queue?: { name?: string };
  github?: {
    appSlug?: string;
    columns?: { planning?: string; implementing?: string; ready?: string };
    label?: string;
  };
  repo?: { url?: string; clonePath?: string; mainBranch?: string };
  slack?: { channelId?: string };
  flutter?: { channel?: string; home?: string };
}

function loadYamlConfig(): YamlSchema {
  try {
    const content = readFileSync(join(process.cwd(), '.kitchen.yaml'), 'utf-8');
    return parse(content) as YamlSchema;
  } catch {
    return {};
  }
}

class YamlConfiguration {
  private readonly yaml: YamlSchema;

  constructor() {
    this.yaml = loadYamlConfig();
  }

  get port() { return this.yaml.port ?? 3000; }
  get redisHost() { return this.yaml.redis?.host ?? 'localhost'; }
  get redisPort() { return this.yaml.redis?.port ?? 6379; }
  get dbHost() { return this.yaml.db?.host ?? 'localhost'; }
  get dbPort() { return this.yaml.db?.port ?? 5432; }
  get dbUser() { return this.yaml.db?.user ?? 'kitchen'; }
  get dbName() { return this.yaml.db?.name ?? 'kitchen'; }
  get queueName() { return this.yaml.queue?.name ?? 'kitchenQueue'; }
  get githubAppSlug() { return this.yaml.github?.appSlug ?? ''; }
  get columnPlanning() { return this.yaml.github?.columns?.planning ?? 'Planning'; }
  get columnImplementing() { return this.yaml.github?.columns?.implementing ?? 'In Progress'; }
  get columnReady() { return this.yaml.github?.columns?.ready ?? 'Ready'; }
  get labelEnabled() { return this.yaml.github?.label ?? 'agent:enabled'; }
  get repoUrl() { return this.yaml.repo?.url ?? ''; }
  get clonePath() { return this.yaml.repo?.clonePath ?? ''; }
  get mainBranch() { return this.yaml.repo?.mainBranch ?? 'main'; }
  get slackChannelId() { return this.yaml.slack?.channelId ?? ''; }
  get flutterChannel() { return this.yaml.flutter?.channel ?? 'stable'; }
  get flutterHome() { return this.yaml.flutter?.home ?? '/opt/flutter'; }
}

// --- Combined configuration ---

export class KitchenConfiguration implements Configuration {
  private readonly env = new EnvConfiguration();
  private readonly yaml = new YamlConfiguration();

  // Non-sensitive (from .kitchen.yaml)
  get port() { return this.yaml.port; }
  get redisHost() { return this.yaml.redisHost; }
  get redisPort() { return this.yaml.redisPort; }
  get dbHost() { return this.yaml.dbHost; }
  get dbPort() { return this.yaml.dbPort; }
  get dbUser() { return this.yaml.dbUser; }
  get dbName() { return this.yaml.dbName; }
  get queueName() { return this.yaml.queueName; }
  get githubAppSlug() { return this.yaml.githubAppSlug; }
  get columnPlanning() { return this.yaml.columnPlanning; }
  get columnImplementing() { return this.yaml.columnImplementing; }
  get columnReady() { return this.yaml.columnReady; }
  get labelEnabled() { return this.yaml.labelEnabled; }
  get repoUrl() { return this.yaml.repoUrl; }
  get clonePath() { return this.yaml.clonePath; }
  get mainBranch() { return this.yaml.mainBranch; }
  get slackChannelId() { return this.yaml.slackChannelId; }
  get flutterChannel() { return this.yaml.flutterChannel; }
  get flutterHome() { return this.yaml.flutterHome; }

  // Secrets (from .env)
  get githubWebhookSecret() { return this.env.githubWebhookSecret; }
  get githubAppId() { return this.env.githubAppId; }
  get githubPrivateKey() { return this.env.githubPrivateKey; }
  get githubInstallationId() { return this.env.githubInstallationId; }
  get claudeCodeOAuthToken() { return this.env.claudeCodeOAuthToken; }
  get slackBotToken() { return this.env.slackBotToken; }
  get dbPassword() { return this.env.dbPassword; }
  get adminUser() { return this.env.adminUser; }
  get adminPassword() { return this.env.adminPassword; }
}

