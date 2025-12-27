import { Router } from "express"
import { authMiddleware } from "../auth/auth.middleware"
import { NotificationsController } from "./notifications.controller"

const router = Router()

router.use(authMiddleware)

router.get("/", NotificationsController.list)
router.post("/:id/accept", NotificationsController.accept)
router.post("/:id/decline", NotificationsController.decline)

export default router

