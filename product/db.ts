import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";

const env = dotenv.config({
    path: path.join(process.cwd(), ".env")
}).parsed ?? {};

export const db = mysql.createPool({
    host: env.HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.USER,
    password: env.PASSWORD,
    database: env.DATABASE,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});