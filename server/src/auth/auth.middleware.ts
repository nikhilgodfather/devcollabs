import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { config } from "../config"
import { UserPayload } from "./types"

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const token = authHeader.split(" ")[1]
    try {
        const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as UserPayload
        // Attach to req
        // @ts-ignore
        req.user = payload
        next()
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" })
    }
}
