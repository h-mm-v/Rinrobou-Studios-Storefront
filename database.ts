import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';

const projectRoot = process.cwd();
const databaseConfig = dotenv.config({ path: path.join(projectRoot, 'databaseDetails.env') }).parsed ?? {};

function getDatabaseHost(value: string): string {
  const configuredHost = value.trim();

  if (configuredHost.startsWith('://')) {
    throw new Error(
      'HOST in databaseDetails.env is missing its hostname. Copy the complete database endpoint from AWS into HOST.',
    );
  }

  if (configuredHost.includes('://')) {
    try {
      const parsedHost = new URL(configuredHost);
      if (!parsedHost.hostname || (parsedHost.protocol !== 'https:' && parsedHost.protocol !== 'http:')) {
        throw new Error();
      }
      return parsedHost.hostname;
    } catch {
      throw new Error(
        'HOST in databaseDetails.env must be a valid database hostname or URL. Check the endpoint in AWS.',
      );
    }
  }

  if (!configuredHost || configuredHost.includes('/') || /\s/.test(configuredHost)) {
    throw new Error(
      'HOST in databaseDetails.env must be a complete database endpoint hostname. Check the endpoint in AWS.',
    );
  }

  return configuredHost;
}

export function getDatabaseConfig() {
  const hostValue = databaseConfig.HOST ?? databaseConfig.DB_HOST ?? process.env.HOST ?? process.env.DB_HOST;
  const user = databaseConfig.USER ?? databaseConfig.DB_USER ?? process.env.USER ?? process.env.DB_USER;
  const password =
    databaseConfig.PASSWORD ?? databaseConfig.DB_PASSWORD ?? process.env.PASSWORD ?? process.env.DB_PASSWORD;
  const database =
    databaseConfig.DATABASE ?? databaseConfig.DB_NAME ?? process.env.DATABASE ?? process.env.DB_NAME;
  const port = Number(databaseConfig.DB_PORT ?? process.env.DB_PORT ?? 3306);

  if (!hostValue || !user || !password || !database) {
    throw new Error(
      'Database configuration is incomplete. Set HOST, USER, PASSWORD, and DATABASE in databaseDetails.env.',
    );
  }

  const host = getDatabaseHost(hostValue);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Database port must be an integer between 1 and 65535.');
  }

  return { host, port, user, password, database };
}

export function createDatabaseConnection() {
  return mysql.createConnection({
    ...getDatabaseConfig(),
    ssl: { rejectUnauthorized: false },
  });
}
