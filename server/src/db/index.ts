import { Pool } from "pg"
import { config } from "../config"

export const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 20, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: config.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
})

pool.on("error", (err: Error) => {
    console.error("Unexpected error on idle client", err)
    process.exit(-1)
})

export const query = (text: string, params?: any[]) => pool.query(text, params)
