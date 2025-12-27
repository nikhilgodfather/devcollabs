import { pool } from "../db"

export class UsersService {
    static async getUserByInviteeIdentifier(invitee: string) {
        const isEmail = invitee.includes("@")
        const result = await pool.query(
            `SELECT id, username, email
             FROM users
             WHERE ${isEmail ? "LOWER(email) = LOWER($1)" : "LOWER(username) = LOWER($1)"}
             LIMIT 1`,
            [invitee],
        )
        return result.rows[0] || null
    }

    static async searchUsers(query: string, requesterUserId: string) {
        const like = `%${query}%`
        const result = await pool.query(
            `SELECT id, username, email, avatar_url
             FROM users
             WHERE id <> $1 AND (username ILIKE $2 OR email ILIKE $2)
             ORDER BY username ASC
             LIMIT 10`,
            [requesterUserId, like],
        )
        return result.rows.map((row: any) => ({
            id: row.id,
            username: row.username,
            email: row.email,
            avatarUrl: row.avatar_url,
        }))
    }
}
