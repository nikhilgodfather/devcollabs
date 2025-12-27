import apiClient from "./axios"

export type NotificationType = "WORKSPACE_INVITE"
export type NotificationStatus = "PENDING" | "ACCEPTED" | "DECLINED"

export type WorkspaceInviteNotificationPayload = {
    type: "WORKSPACE_INVITE"
    workspaceId: string
    workspaceName: string
    invitedBy: {
        id: string
        username: string
    }
    role: "COLLABORATOR" | "VIEWER"
}

export interface Notification {
    id: string
    type: NotificationType
    status: NotificationStatus
    payload: WorkspaceInviteNotificationPayload
    createdAt: string
    resolvedAt?: string
}

export const getNotifications = async (): Promise<{ unreadCount: number; notifications: Notification[] }> => {
    const response = await apiClient.get(`/api/v1/notifications`)
    return response.data
}

export const acceptNotification = async (id: string): Promise<{ message: string; workspaceId: string; role: string }> => {
    const response = await apiClient.post(`/api/v1/notifications/${id}/accept`)
    return response.data
}

export const declineNotification = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/notifications/${id}/decline`)
    return response.data
}

