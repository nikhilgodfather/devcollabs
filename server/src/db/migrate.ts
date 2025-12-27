import "dotenv/config"
import fs from "fs"
import path from "path"
import { pool } from "./index"

const run = async () => {
    const migrationPath = path.join(__dirname, "migrations", "002_workspace_invites_notifications.sql")
    const sql = fs.readFileSync(migrationPath, "utf8")

    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await client.query(sql)
        await client.query("COMMIT")
        // eslint-disable-next-line no-console
        console.log("DB migration applied:", path.basename(migrationPath))
    } catch (e) {
        await client.query("ROLLBACK")
        // eslint-disable-next-line no-console
        console.error("DB migration failed:", e)
        process.exitCode = 1
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
})

