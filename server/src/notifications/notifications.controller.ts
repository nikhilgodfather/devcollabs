import { Request, Response } from "express"
import { NotificationsService } from "./notifications.service"

export class NotificationsController {
    static async list(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const result = await NotificationsService.listForUser(userId)
            res.json(result)
        } catch (error: any) {
            res.status(500).json({ error: error.message || "Failed to fetch notifications" })
        }
    }

    static async accept(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const notificationId = req.params.id
            const result = await NotificationsService.acceptWorkspaceInvite(notificationId, userId)
            res.json(result)
        } catch (error: any) {
            const status = error?.statusCode || 500
            res.status(status).json({ error: error.message || "Failed to accept notification" })
        }
    }

    static async decline(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const notificationId = req.params.id
            const result = await NotificationsService.declineWorkspaceInvite(notificationId, userId)
            res.json(result)
        } catch (error: any) {
            const status = error?.statusCode || 500
            res.status(status).json({ error: error.message || "Failed to decline notification" })
        }
    }
}

