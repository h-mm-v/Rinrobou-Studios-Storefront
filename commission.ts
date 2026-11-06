import mysql, { type ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';

const databaseConfig = dotenv.config({ path: 'databaseDetails.env' }).parsed ?? {};

interface CommissionRequest {
  email: string;
  phone?: string;
  description: string;
  attachments: string;
  physical: boolean;
  deadline: string;
}

function getDatabaseConfig() {
  const host = process.env.DB_HOST ?? databaseConfig.HOST ?? process.env.HOST;
  const portValue = process.env.DB_PORT ?? databaseConfig.DB_PORT ?? '3306';
  const user = process.env.DB_USER ?? databaseConfig.USER;
  const password = process.env.DB_PASSWORD ?? databaseConfig.PASSWORD;
  const database = process.env.DB_NAME ?? databaseConfig.DATABASE;
  const port = Number(portValue);

  if (!host || !user || !password || !database) {
    throw new Error('Database configuration is incomplete. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Database port must be an integer between 1 and 65535.');
  }

  return { host, port, user, password, database };
}

export async function createCommission(commission: CommissionRequest): Promise<number> {
  const connection = await mysql.createConnection({
    ...getDatabaseConfig(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const query =
      'INSERT INTO commissions (email, phone, description, attachments, physical, deadline) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [
      commission.email,
      commission.phone ?? null,
      commission.description,
      commission.attachments,
      commission.physical,
      commission.deadline,
    ];
    const [result] = await connection.execute<ResultSetHeader>(query, values);

    console.log('Commission created successfully with ID:', result.insertId);
    return result.insertId;
  } finally {
    await connection.end();
  }
}
