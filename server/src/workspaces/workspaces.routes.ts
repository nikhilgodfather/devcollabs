import { Router } from "express"
import { WorkspacesController } from "./workspaces.controller"
import { authMiddleware } from "../auth/auth.middleware"

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace and collaboration management
 */

router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/workspaces:
 *   get:
 *     summary: Get all workspaces for current user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get("/", WorkspacesController.getAll)

/**
 * @swagger
 * /api/v1/workspaces:
 *   post:
 *     summary: Create an independent workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created
 */
router.post("/", WorkspacesController.createIndependent)

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   get:
 *     summary: Get workspace details
 *     tags: [Workspaces]
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
 *         description: Workspace details
 */
router.get("/:id", WorkspacesController.getOne)

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   put:
 *     summary: Update workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated
 */
router.put("/:id", WorkspacesController.update)

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   delete:
 *     summary: Delete workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workspace deleted
 */
router.get("/:id", WorkspacesController.delete)

/**
 * @swagger
 * /api/v1/workspaces/{id}/join:
 *   post:
 *     summary: Join a workspace
 *     tags: [Workspaces]
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
 *         description: Joined successfully
 */
router.post("/:id/join", WorkspacesController.join)

/**
 * @swagger
 * /api/v1/workspaces/{id}/invite:
 *   post:
 *     summary: Invite a user to a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invitee
 *               - role
 *             properties:
 *               invitee:
 *                 type: string
 *                 description: Username or email
 *               role:
 *                 type: string
 *                 enum: [COLLABORATOR, VIEWER]
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post("/:id/invite", WorkspacesController.invite)

/**
 * @swagger
 * /api/v1/workspaces/{id}/invites:
 *   get:
 *     summary: Get pending invites for a workspace
 *     tags: [Workspaces]
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
 *         description: List of pending invites
 */
router.get("/:id/invites", WorkspacesController.getInvites)

/**
 * @swagger
 * /api/v1/workspaces/{id}/members:
 *   get:
 *     summary: Get members of a workspace
 *     tags: [Workspaces]
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
 *         description: List of members
 */
router.get("/:id/members", WorkspacesController.getMembers)

/**
 * @swagger
 * /api/v1/workspaces/{id}/members/{userId}:
 *   put:
 *     summary: Update member role
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [COLLABORATOR, VIEWER]
 *     responses:
 *       200:
 *         description: Member role updated
 */
router.put("/:id/members/:userId", WorkspacesController.updateMember)

/**
 * @swagger
 * /api/v1/workspaces/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a collaborator from a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Member removed
 */
router.delete("/:id/members/:userId", WorkspacesController.deleteMember)

export default router
