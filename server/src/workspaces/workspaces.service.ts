import { pool } from "../db"
import { UserRole } from "../auth/types"
import { cacheAside, getCached, deleteCached, setCached, invalidatePattern } from "../common/cache/cache.service"

export class WorkspacesService {
    static async createWorkspace(projectId: string | null, ownerId: string, name: string, slug?: string) {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            
            // Create Workspace (projectId can be null for independent workspaces)
            const wsRes = await client.query(
                "INSERT INTO workspaces (project_id, owner_id, name, slug) VALUES ($1, $2, $3, $4) RETURNING *",
                [projectId, ownerId, name, slug]
            )
            const workspace = wsRes.rows[0]

            // Add Owner as Member
            await client.query(
                "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)",
                [workspace.id, ownerId, UserRole.OWNER]
            )

            await client.query('COMMIT')
            
            // Invalidate user's workspace list
            await deleteCached(`devcollab:cache:user:${ownerId}:workspaces`)
            if (projectId) {
                // Invalidate project's workspace list and project details
                await invalidatePattern(`devcollab:cache:project:${projectId}*`)
                // Invalidate all users' project list cache
                await invalidatePattern("devcollab:cache:user:*:projects")
            }

            return workspace
        } catch (e) {
            await client.query('ROLLBACK')
            throw e
        } finally {
            client.release()
        }
    }

    static async getWorkspaceById(workspaceId: string) {
        return cacheAside(
            `devcollab:cache:workspace:${workspaceId}`,
            3600, // 1 hour
            async () => {
                const result = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId])
                return result.rows[0]
            }
        )
    }

    static async getWorkspacesByProject(projectId: string) {
        return cacheAside(
            `devcollab:cache:project:${projectId}:workspaces`,
            1800,
            async () => {
                const result = await pool.query(
                    "SELECT * FROM workspaces WHERE project_id = $1 ORDER BY created_at DESC",
                    [projectId]
                )
                return result.rows
            }
        )
    }

    // Get all workspaces for a user (based on membership)
    static async getWorkspacesByUser(userId: string) {
        return cacheAside(
            `devcollab:cache:user:${userId}:workspaces`,
            1800,
            async () => {
                const result = await pool.query(`
                    SELECT DISTINCT w.*, wm.role as user_role
                    FROM workspaces w
                    INNER JOIN workspace_members wm ON w.id = wm.workspace_id
                    WHERE wm.user_id = $1
                    ORDER BY w.created_at DESC
                `, [userId])
                return result.rows
            }
        )
    }

    static async getMemberRole(workspaceId: string, userId: string): Promise<UserRole | null> {
        const cacheKey = `devcollab:cache:workspace:${workspaceId}:user:${userId}:role`
        const cachedRole = await getCached<UserRole>(cacheKey)
        if (cachedRole) return cachedRole

        const result = await pool.query(
            "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
            [workspaceId, userId]
        )
        const role = result.rows[0]?.role || null
        if (role) {
            await setCached(cacheKey, role, 3600)
        }
        return role
    }

    static async updateWorkspace(workspaceId: string, name?: string) {
        const result = await pool.query(
            "UPDATE workspaces SET name = COALESCE($2, name), updated_at = NOW() WHERE id = $1 RETURNING *",
            [workspaceId, name]
        )
        const workspace = result.rows[0]
        if (workspace) {
            // Invalidate item and associate data (members, role, etc)
            await invalidatePattern(`devcollab:cache:workspace:${workspaceId}*`)
            // Invalidate owner's list
            await deleteCached(`devcollab:cache:user:${workspace.owner_id}:workspaces`)
            if (workspace.project_id) {
                await invalidatePattern(`devcollab:cache:project:${workspace.project_id}*`)
            }
        }
        return workspace
    }

    static async deleteWorkspace(workspaceId: string) {
        const ws = await this.getWorkspaceById(workspaceId)
        await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId])
        
        // Invalidate workspace data
        await invalidatePattern(`devcollab:cache:workspace:${workspaceId}*`)
        if (ws) {
            await deleteCached(`devcollab:cache:user:${ws.owner_id}:workspaces`)
            if (ws.project_id) {
                await invalidatePattern(`devcollab:cache:project:${ws.project_id}*`)
                await invalidatePattern("devcollab:cache:user:*:projects")
            }
        }
    }

    static async createInvite(params: {
        workspaceId: string
        inviterId: string
        inviteeId: string
        role: UserRole.COLLABORATOR | UserRole.VIEWER
    }) {
        const { workspaceId, inviterId, inviteeId, role } = params
        const client = await pool.connect()
        try {
            await client.query("BEGIN")

            const wsRes = await client.query("SELECT id, name FROM workspaces WHERE id = $1", [workspaceId])
            const workspace = wsRes.rows[0]
            if (!workspace) {
                const err: any = new Error("Workspace not found")
                err.statusCode = 404
                throw err
            }

            // Ensure inviter is OWNER
            const inviterRoleRes = await client.query(
                "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
                [workspaceId, inviterId],
            )
            if (inviterRoleRes.rows[0]?.role !== UserRole.OWNER) {
                const err: any = new Error("Only Owner can invite")
                err.statusCode = 403
                throw err
            }

            // Ensure invitee is not already a member
            const memberRes = await client.query(
                "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
                [workspaceId, inviteeId],
            )
            if (memberRes.rows.length > 0) {
                const err: any = new Error("User is already a member")
                err.statusCode = 409
                throw err
            }

            // Ensure no existing PENDING invite
            const pendingRes = await client.query(
                "SELECT id FROM workspace_invites WHERE workspace_id = $1 AND invitee_id = $2 AND status = 'PENDING' LIMIT 1",
                [workspaceId, inviteeId],
            )
            if (pendingRes.rows.length > 0) {
                const err: any = new Error("User already invited")
                err.statusCode = 409
                throw err
            }

            const inviteRes = await client.query(
                `INSERT INTO workspace_invites (workspace_id, inviter_id, invitee_id, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [workspaceId, inviterId, inviteeId, role],
            )
            const inviteId = inviteRes.rows[0].id

            const inviterUserRes = await client.query("SELECT id, username FROM users WHERE id = $1", [inviterId])
            const inviterUser = inviterUserRes.rows[0]
            if (!inviterUser) {
                const err: any = new Error("Inviter not found")
                err.statusCode = 400
                throw err
            }

            const payload = {
                type: "WORKSPACE_INVITE",
                workspaceId,
                workspaceName: workspace.name,
                invitedBy: {
                    id: inviterUser.id,
                    username: inviterUser.username,
                },
                role,
            }

            await client.query(
                `INSERT INTO notifications (user_id, type, status, payload, workspace_id, invite_id)
                 VALUES ($1, 'WORKSPACE_INVITE', 'PENDING', $2, $3, $4)`,
                [inviteeId, payload, workspaceId, inviteId],
            )

            await client.query("COMMIT")
            return { inviteId }
        } catch (e) {
            await client.query("ROLLBACK")
            throw e
        } finally {
            client.release()
        }
    }

    static async getPendingInvites(workspaceId: string) {
        const result = await pool.query(
            `SELECT wi.id,
                    wi.invitee_id,
                    wi.role,
                    wi.created_at,
                    u.username,
                    u.email,
                    u.avatar_url
             FROM workspace_invites wi
             JOIN users u ON u.id = wi.invitee_id
             WHERE wi.workspace_id = $1 AND wi.status = 'PENDING'
             ORDER BY wi.created_at DESC`,
            [workspaceId],
        )
        return result.rows.map((row) => ({
            id: row.id,
            inviteeId: row.invitee_id,
            role: row.role,
            createdAt: row.created_at,
            invitee: {
                id: row.invitee_id,
                username: row.username,
                email: row.email,
                avatarUrl: row.avatar_url,
            },
        }))
    }

    static async updateMemberRole(workspaceId: string, userId: string, role: UserRole) {
        await pool.query(
            "UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2",
            [workspaceId, userId, role]
        )
        // Invalidate role cache
        await deleteCached(`devcollab:cache:workspace:${workspaceId}:user:${userId}:role`)
        // Invalidate member list cache
        await deleteCached(`devcollab:cache:workspace:${workspaceId}:members`)
    }

    static async getMembers(workspaceId: string) {
        return cacheAside(
            `devcollab:cache:workspace:${workspaceId}:members`,
            1800,
            async () => {
                const result = await pool.query(`
                    SELECT wm.user_id, wm.role, wm.joined_at, u.username, u.email, u.avatar_url
                    FROM workspace_members wm
                    JOIN users u ON wm.user_id = u.id
                    WHERE wm.workspace_id = $1
                `, [workspaceId])
                return result.rows
            }
        )
    }

    static async removeMember(workspaceId: string, userId: string) {
        await pool.query(
            "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
            [workspaceId, userId]
        )
        // Invalidate role cache
        await deleteCached(`devcollab:cache:workspace:${workspaceId}:user:${userId}:role`)
        // Invalidate member list cache
        await deleteCached(`devcollab:cache:workspace:${workspaceId}:members`)
        // Invalidate user's workspace list
        await deleteCached(`devcollab:cache:user:${userId}:workspaces`)
        
        // Invalidate project list cache if it was their only workspace in a project
        const ws = await this.getWorkspaceById(workspaceId)
        if (ws && ws.project_id) {
            await deleteCached(`devcollab:cache:user:${userId}:projects`)
        }
    }
}
