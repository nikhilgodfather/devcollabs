import { pool } from "../db"

type NotificationStatus = "PENDING" | "ACCEPTED" | "DECLINED"
type NotificationType = "WORKSPACE_INVITE"

type WorkspaceInviteRole = "COLLABORATOR" | "VIEWER"

export type WorkspaceInvitePayload = {
    type: "WORKSPACE_INVITE"
    workspaceId: string
    workspaceName: string
    invitedBy: {
        id: string
        username: string
    }
    role: WorkspaceInviteRole
}

class HttpError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
        super(message)
        this.statusCode = statusCode
    }
}

export class NotificationsService {
    static async createWorkspaceInviteNotification(params: {
        recipientUserId: string
        workspaceId: string
        inviteId: string
        payload: WorkspaceInvitePayload
    }) {
        const { recipientUserId, workspaceId, inviteId, payload } = params
        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, status, payload, workspace_id, invite_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [recipientUserId, "WORKSPACE_INVITE" satisfies NotificationType, "PENDING" satisfies NotificationStatus, payload, workspaceId, inviteId],
        )
        return result.rows[0]
    }

    static async listForUser(userId: string) {
        const result = await pool.query(
            `SELECT id, type, status, payload, created_at, resolved_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId],
        )
        const notifications = result.rows.map((row: any) => ({
            id: row.id,
            type: row.type,
            status: row.status,
            payload: row.payload,
            createdAt: row.created_at,
            resolvedAt: row.resolved_at,
        }))
        const unreadCount = notifications.filter((n: any) => n.status === "PENDING").length
        return { unreadCount, notifications }
    }

    static async acceptWorkspaceInvite(notificationId: string, userId: string) {
        const client = await pool.connect()
        try {
            await client.query("BEGIN")

            const notifRes = await client.query(
                `SELECT id, type, status, invite_id
                 FROM notifications
                 WHERE id = $1 AND user_id = $2
                 FOR UPDATE`,
                [notificationId, userId],
            )
            const notif = notifRes.rows[0]
            if (!notif) throw new HttpError(404, "Notification not found")
            if (notif.type !== "WORKSPACE_INVITE") throw new HttpError(400, "Unsupported notification type")
            if (notif.status !== "PENDING") throw new HttpError(400, "Notification already resolved")
            if (!notif.invite_id) throw new HttpError(400, "Invalid invite notification")

            const inviteRes = await client.query(
                `SELECT id, workspace_id, invitee_id, role, status
                 FROM workspace_invites
                 WHERE id = $1
                 FOR UPDATE`,
                [notif.invite_id],
            )
            const invite = inviteRes.rows[0]
            if (!invite) throw new HttpError(404, "Invite not found")
            if (invite.invitee_id !== userId) throw new HttpError(403, "Forbidden")
            if (invite.status !== "PENDING") throw new HttpError(400, "Invite already resolved")

            await client.query(
                `INSERT INTO workspace_members (workspace_id, user_id, role)
                 VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING`,
                [invite.workspace_id, userId, invite.role],
            )

            await client.query(
                `UPDATE workspace_invites
                 SET status = 'ACCEPTED', responded_at = NOW()
                 WHERE id = $1`,
                [invite.id],
            )

            await client.query(
                `UPDATE notifications
                 SET status = 'ACCEPTED', resolved_at = NOW()
                 WHERE id = $1`,
                [notificationId],
            )

            await client.query("COMMIT")
            return { message: "Invite accepted", workspaceId: invite.workspace_id, role: invite.role }
        } catch (e) {
            await client.query("ROLLBACK")
            throw e
        } finally {
            client.release()
        }
    }

    static async declineWorkspaceInvite(notificationId: string, userId: string) {
        const client = await pool.connect()
        try {
            await client.query("BEGIN")

            const notifRes = await client.query(
                `SELECT id, type, status, invite_id
                 FROM notifications
                 WHERE id = $1 AND user_id = $2
                 FOR UPDATE`,
                [notificationId, userId],
            )
            const notif = notifRes.rows[0]
            if (!notif) throw new HttpError(404, "Notification not found")
            if (notif.type !== "WORKSPACE_INVITE") throw new HttpError(400, "Unsupported notification type")
            if (notif.status !== "PENDING") throw new HttpError(400, "Notification already resolved")
            if (!notif.invite_id) throw new HttpError(400, "Invalid invite notification")

            const inviteRes = await client.query(
                `SELECT id, invitee_id, status
                 FROM workspace_invites
                 WHERE id = $1
                 FOR UPDATE`,
                [notif.invite_id],
            )
            const invite = inviteRes.rows[0]
            if (!invite) throw new HttpError(404, "Invite not found")
            if (invite.invitee_id !== userId) throw new HttpError(403, "Forbidden")
            if (invite.status !== "PENDING") throw new HttpError(400, "Invite already resolved")

            await client.query(
                `UPDATE workspace_invites
                 SET status = 'DECLINED', responded_at = NOW()
                 WHERE id = $1`,
                [invite.id],
            )

            await client.query(
                `UPDATE notifications
                 SET status = 'DECLINED', resolved_at = NOW()
                 WHERE id = $1`,
                [notificationId],
            )

            await client.query("COMMIT")
            return { message: "Invite declined" }
        } catch (e) {
            await client.query("ROLLBACK")
            throw e
        } finally {
            client.release()
        }
    }
}

