import { Router } from "express"
import { JobsController } from "./jobs.controller"
import { authMiddleware } from "../auth/auth.middleware"

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Asynchronous job processing (e.g., code execution)
 */

router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get job history
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent jobs
 */
router.get("/", JobsController.getAll)

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job (e.g., execute code)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - payload
 *             properties:
 *               type:
 *                 type: string
 *                 description: Type of job
 *                 enum: [CODE_EXECUTION, PROJECT_EXPORT, SEND_NOTIFICATION]
 *               payload:
 *                 type: object
 *                 description: Job-specific data
 *           examples:
 *             CodeExecution:
 *               summary: Execute JavaScript Code
 *               value:
 *                 type: CODE_EXECUTION
 *                 payload:
 *                   code: "console.log('Hello from DevCollab!');"
 *                   language: "javascript"
 *             ProjectExport:
 *               summary: Export Project as ZIP
 *               value:
 *                 type: PROJECT_EXPORT
 *                 payload:
 *                   projectId: "provide-project-id-here"
 *                   format: "zip"
 *             SendNotification:
 *               summary: Send Workspace Notification
 *               value:
 *                 type: SEND_NOTIFICATION
 *                 payload:
 *                   userId: "provide-user-id-here"
 *                   title: "Workspace Update"
 *                   message: "A new collaborator has joined the workspace."
 *     responses:
 *       201:
 *         description: Job created and queued successfully
 *         content:
 *           application/json:
 *             example:
 *               jobId: "job_123456789"
 *               status: "PENDING"
 *               message: "Job queued"
 */
router.post("/", JobsController.createJob)

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get job status and results
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details and status
 */
router.get("/:id", JobsController.getJob)

export default router
