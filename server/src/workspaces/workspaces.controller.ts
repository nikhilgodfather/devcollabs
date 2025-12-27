import { Request, Response } from "express"
import { z } from "zod"
import { WorkspacesService } from "./workspaces.service"
import { ProjectsService } from "../projects/projects.service"
import { UserRole } from "../auth/types"
import { UsersService } from "../users/users.service"

const createWsSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().optional()
})

const inviteSchema = z.object({
    invitee: z.string().min(1).max(255), // username or email
    role: z.enum([UserRole.COLLABORATOR, UserRole.VIEWER]),
})

const updateRoleSchema = z.object({
    role: z.enum([UserRole.COLLABORATOR, UserRole.VIEWER]) // Start safe
})

export class WorkspacesController {
    // Create workspace under a project (legacy endpoint)
    static async create(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projectId = req.params.id
            const { name, slug } = createWsSchema.parse(req.body)

            // Verify Project Ownership
            const project = await ProjectsService.getProjectById(projectId)
            if (!project) return res.status(404).json({ error: "Project not found" })
            if (project.ownerId !== userId) return res.status(403).json({ error: "Forbidden" })

            const ws = await WorkspacesService.createWorkspace(projectId, userId, name, slug)
            res.status(201).json(ws)
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Failed" })
        }
    }

    // Create independent workspace (no project required)
    static async createIndependent(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const { name, slug } = createWsSchema.parse(req.body)

            // Create workspace without project (projectId = null)
            const ws = await WorkspacesService.createWorkspace(null, userId, name, slug)
            res.status(201).json(ws)
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Failed" })
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const workspaces = await WorkspacesService.getWorkspacesByUser(userId)
            res.json(workspaces)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch workspaces" })
        }
    }

    static async getAllByProject(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projectId = req.params.id

            // Check project access (Owner or Member)
            const projects = await ProjectsService.getProjects(userId)
            const hasAccess = projects.some((p: any) => p.id === projectId)
            
            if (!hasAccess) return res.status(403).json({ error: "Access denied" })

            const workspaces = await WorkspacesService.getWorkspacesByProject(projectId)
            res.json(workspaces)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch workspaces" })
        }
    }

    static async getOne(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            
            const role = await WorkspacesService.getMemberRole(wsId, userId)
            if (!role) return res.status(403).json({ error: "Access denied" })

            const ws = await WorkspacesService.getWorkspaceById(wsId)
            res.json({ ...ws, role })
        } catch (error) {
            res.status(500).json({ error: "Error fetching workspace" })
        }
    }

    static async update(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            const { name } = req.body

            const role = await WorkspacesService.getMemberRole(wsId, userId)
            if (role !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can update" })

            const updated = await WorkspacesService.updateWorkspace(wsId, name)
            res.json(updated)
        } catch (error) {
            res.status(400).json({ error: "Update failed" })
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id

            const role = await WorkspacesService.getMemberRole(wsId, userId)
            if (role !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can delete" })

            await WorkspacesService.deleteWorkspace(wsId)
            res.status(204).send()
        } catch (error) {
            res.status(500).json({ error: "Delete failed" })
        }
    }

    static async join(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id

            const ws = await WorkspacesService.getWorkspaceById(wsId)
            if (!ws) return res.status(404).json({ error: "Workspace not found" })

            const role = await WorkspacesService.getMemberRole(wsId, userId)
            if (!role) return res.status(403).json({ error: "Access denied" })

            res.json({ role })
        } catch (error) {
            console.error("Join error:", error)
            res.status(500).json({ error: "Failed to join workspace" })
        }
    }

    static async invite(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            const { invitee, role: requestedRole } = inviteSchema.parse(req.body)

            const myRole = await WorkspacesService.getMemberRole(wsId, userId)
            if (myRole !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can invite" })

            const inviteeUser = await UsersService.getUserByInviteeIdentifier(invitee)
            if (!inviteeUser) return res.status(404).json({ error: "User not found" })
            if (inviteeUser.id === userId) return res.status(400).json({ error: "Cannot invite self" })

            await WorkspacesService.createInvite({
                workspaceId: wsId,
                inviterId: userId,
                inviteeId: inviteeUser.id,
                role: requestedRole,
            })

            res.json({ message: "Invited" })
        } catch (error:any) {
            const status = error?.statusCode || 400
            res.status(status).json({ error: error.message || "Invite failed" })
        }
    }

    static async getInvites(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id

            const myRole = await WorkspacesService.getMemberRole(wsId, userId)
            if (myRole !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can view invites" })

            const invites = await WorkspacesService.getPendingInvites(wsId)
            res.json(invites)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch invites" })
        }
    }

    static async updateMember(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            const targetUserId = req.params.userId
            const { role } = updateRoleSchema.parse(req.body)

            const myRole = await WorkspacesService.getMemberRole(wsId, userId)
            if (myRole !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can manage roles" })

            if (userId === targetUserId) return res.status(400).json({ error: "Cannot change own role" })

            await WorkspacesService.updateMemberRole(wsId, targetUserId, role)
            res.json({ message: "Role updated" })
        } catch (error) {
            res.status(400).json({ error: "Update failed" })
        }
    }

    static async getMembers(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            
            const role = await WorkspacesService.getMemberRole(wsId, userId)
            if (!role) return res.status(403).json({ error: "Access denied" })

            const members = await WorkspacesService.getMembers(wsId)
            res.json(members)
        } catch (error) {
             res.status(500).json({ error: "Failed to list members" })
        }
    }

    static async deleteMember(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const wsId = req.params.id
            const targetUserId = req.params.userId

            const myRole = await WorkspacesService.getMemberRole(wsId, userId)
            if (myRole !== UserRole.OWNER) return res.status(403).json({ error: "Only Owner can remove members" })

            if (userId === targetUserId) return res.status(400).json({ error: "Cannot remove self" })

            await WorkspacesService.removeMember(wsId, targetUserId)
            res.status(204).send()
        } catch (error) {
            res.status(500).json({ error: "Remove failed" })
        }
    }
}
