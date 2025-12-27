import { Request, Response } from "express"
import { z } from "zod"
import { UsersService } from "./users.service"

const searchSchema = z.object({
    q: z.string().min(2).max(100),
})

export class UsersController {
    static async search(req: Request, res: Response) {
        try {
            const { q } = searchSchema.parse(req.query)
            // @ts-ignore
            const userId = req.user.userId
            const users = await UsersService.searchUsers(q, userId)
            res.json(users)
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Invalid query" })
        }
    }
}

