import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import { pool } from "../db"
import { config } from "../config"
import { AuthResponse, UserPayload } from "./types"
import crypto from "crypto"

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID)

export class AuthService {
    // Generate Access & Refresh Tokens
    private static async generateTokens(user: { id: string; email: string; username: string }) {
        const payload: UserPayload = { userId: user.id, email: user.email, username: user.username }
        
        const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: "15m" })
        const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: "7d" })

        return { accessToken, refreshToken }
    }

    // Hash refresh token for storage
    private static hashRefreshToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex")
    }

    // Register
    static async register(email: string, username: string, password: string): Promise<AuthResponse> {
        const passwordHash = await bcrypt.hash(password, 10)
        
        try {
            const result = await pool.query(
                `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_url`,
                [username, email, passwordHash]
            )
            const user = result.rows[0]
            const tokens = await this.generateTokens(user)
            await this.storeRefreshToken(user.id, tokens.refreshToken)
            
            return { user, ...tokens }
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                throw new Error("Username or Email already exists")
            }
            throw error
        }
    }

    // Login
    static async login(email: string, password: string): Promise<AuthResponse> {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1 AND is_active = TRUE`, [email])
        const user = result.rows[0]

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            throw new Error("Invalid credentials")
        }

        const tokens = await this.generateTokens(user)
        await this.storeRefreshToken(user.id, tokens.refreshToken)

        return { 
            user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatar_url }, 
            ...tokens 
        }
    }

    // Refresh Token Rotation
    static async refresh(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        try {
            // Verify JWT
            const decoded = jwt.verify(oldRefreshToken, config.JWT_REFRESH_SECRET) as UserPayload
            const tokenHash = this.hashRefreshToken(oldRefreshToken)

            // Check if token exists and is not revoked
            const check = await pool.query(
                `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 AND revoked = FALSE`,
                [tokenHash, decoded.userId]
            )

            if (check.rows.length === 0) {
                // Potential reuse detection could go here (revoke all user tokens)
                throw new Error("Invalid refresh token")
            }

            // Revoke old token
            await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [check.rows[0].id])

            // Issue new
            const userRes = await pool.query(`SELECT * FROM users WHERE id = $1`, [decoded.userId])
            const user = userRes.rows[0]
            if (!user) throw new Error("User not found")

            const newTokens = await this.generateTokens(user)
            await this.storeRefreshToken(user.id, newTokens.refreshToken)

            return newTokens

        } catch (error) {
            throw new Error("Invalid or expired refresh token")
        }
    }

    // OAuth: Google
    static async googleLogin(idToken: string): Promise<AuthResponse> {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config.GOOGLE_CLIENT_ID,
        })
        const payload = ticket.getPayload()
        if (!payload || !payload.email) throw new Error("Invalid Google Token")

        const { email, name, picture } = payload

        // Check if user exists
        let result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email])
        let user = result.rows[0]

        if (!user) {
            // Register new user with NULL password
            const username = email.split("@")[0] + "_" + crypto.randomBytes(4).toString("hex")
            const insertResult = await pool.query(
                `INSERT INTO users (username, email, password_hash, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *`,
                [username, email, "OAUTH_USER", picture]
            )
            user = insertResult.rows[0]
        } else if (!user.is_active) {
            throw new Error("User is banned")
        }

        const tokens = await this.generateTokens(user)
        await this.storeRefreshToken(user.id, tokens.refreshToken)

        return { 
            user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatar_url }, 
            ...tokens 
        }
    }

    private static async storeRefreshToken(userId: string, token: string) {
        const hash = this.hashRefreshToken(token)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [userId, hash, expiresAt]
        )
    }

    static async logout(refreshToken: string) {
        const hash = this.hashRefreshToken(refreshToken)
        await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [hash])
    }
    
    static async me(userId: string) {
         const result = await pool.query(`SELECT id, username, email, avatar_url FROM users WHERE id = $1`, [userId])
         return result.rows[0]
    }
}
