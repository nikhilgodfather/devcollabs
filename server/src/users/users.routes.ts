import { Router } from "express"
import { authMiddleware } from "../auth/auth.middleware"
import { UsersController } from "./users.controller"

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and search
 */

router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search for users by username or email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get("/search", UsersController.search)

export default router
