import { Request, Response } from "express"
import { AuthService } from "./auth.service"
import { z } from "zod"

const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(6),
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
})

const refreshSchema = z.object({
    refreshToken: z.string(),
})

const googleSchema = z.object({
    idToken: z.string()
})

export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const { email, username, password } = registerSchema.parse(req.body)
            const result = await AuthService.register(email, username, password)
            res.status(201).json(result)
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Invalid input" })
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = loginSchema.parse(req.body)
            const result = await AuthService.login(email, password)
            res.json(result)
        } catch (error: any) {
            res.status(401).json({ error: "Invalid credentials" })
        }
    }

    static async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = refreshSchema.parse(req.body)
            const result = await AuthService.refresh(refreshToken)
            res.json(result)
        } catch (error) {
            res.status(401).json({ error: "Invalid refresh token" })
        }
    }

    static async googleLogin(req: Request, res: Response) {
         try {
            const { idToken } = googleSchema.parse(req.body)
            const result = await AuthService.googleLogin(idToken)
            res.json(result)
        } catch (error) {
            res.status(401).json({ error: "Google auth failed" })
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body
            if (refreshToken) {
                await AuthService.logout(refreshToken)
            }
            res.json({ message: "Logged out" })
        } catch (error) {
            res.status(500).json({ error: "Logout failed" })
        }
    }

    static async me(req: Request, res: Response) {
        try {
            // @ts-ignore - userId attached by middleware
            const userId = req.user?.userId
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" })
            }
            const user = await AuthService.me(userId)
            if (!user) return res.status(404).json({error: "User not found"})
            res.json(user)
        } catch(e) {
             res.status(500).json({ error: "Server error" })
        }
    }
}
