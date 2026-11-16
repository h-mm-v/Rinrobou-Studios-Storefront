import bcrypt from "bcrypt";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "./db.js";

export interface RegisterFunction {
    email: string;
    password: string;
}

export interface LoginFunction {
    email: string;
    password: string;
}

export interface UserRecord {
    id: number;
    email: string;
    role: "customer" | "admin";
}

// Registration Logic
export async function registerUser({ email, password }: RegisterFunction): Promise<UserRecord> {
    const standardizedEmail = email.trim().toLowerCase();

    // Check if email / password is valid
    if (!standardizedEmail || !standardizedEmail.includes("@")) {
        throw new Error("Invalid email address");
    }
    if (!password || password.length <8) {
        throw new Error("Password must be at least 8 characters long");
    }

    // Check if email is already being used
    const [existingRows] = await pool.query<RowDataPacket[]> (
        "SELECT id FROM users WHERE email = ? LIMIT 1", 
        [standardizedEmail]
    );

    if (existingRows.length > 0) {
        throw new Error("An account with this email already exists.");
    }

    // Hash password
    const saltRounds = 12;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute<ResultSetHeader> (
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
        [standardizedEmail, hashPassword, "customer"]
    );

    return {
        id: result.insertId,
        email: standardizedEmail,
        role: "customer",
    }
}

// Login logic
export async function loginUser({ email, password }: LoginFunction): Promise<UserRecord> {
    const standardizedEmail = email.trim().toLowerCase();

    // Check for existing user email
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
        [standardizedEmail]
    );

    // Check rows
    if (rows.length === 0 || !rows || !rows[0]) {
        throw new Error("Invalid email or password.");
    }
    const user = rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if(!isPasswordValid) {
        throw new Error("Invalid email or password.");
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
    }
}




