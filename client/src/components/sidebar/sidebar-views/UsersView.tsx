import Users from "@/components/common/Users"
import { getWorkspace, getWorkspaceMembers, updateWorkspaceMemberRole, WorkspaceMemberRow, WorkspaceRole } from "@/api/workspaces"
import { useAppContext } from "@/context/AppContext"
import { useAuth } from "@/context/AuthContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { USER_STATUS } from "@/types/user"
import toast from "react-hot-toast"
import { GoSignOut } from "react-icons/go"
import { IoShareOutline } from "react-icons/io5"
import { LuCopy } from "react-icons/lu"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import InviteModal from "@/components/workspace/InviteModal"

function UsersView() {
    const navigate = useNavigate()
    const { viewHeight } = useResponsive()
    const { setStatus, currentUser } = useAppContext()
    const { user } = useAuth()
    const { socket } = useSocket()
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [workspaceName, setWorkspaceName] = useState<string>("")
    const [members, setMembers] = useState<WorkspaceMemberRow[]>([])
    const [isLoadingMembers, setIsLoadingMembers] = useState(false)
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

    const copyURL = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            toast.success("URL copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy URL to clipboard")
            console.log(error)
        }
    }

    const shareURL = async () => {
        const url = window.location.href
        try {
            await navigator.share({ url })
        } catch (error) {
            toast.error("Unable to share URL")
            console.log(error)
        }
    }

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(USER_STATUS.DISCONNECTED)
        navigate("/", {
            replace: true,
        })
    }

    const workspaceId = currentUser.roomId || ""

    const canManageMembers = currentUser.role === "OWNER"

    const myUserId = user?.id

    const refreshMembers = async () => {
        if (!workspaceId) return
        setIsLoadingMembers(true)
        try {
            const [ws, list] = await Promise.all([getWorkspace(workspaceId), getWorkspaceMembers(workspaceId)])
            setWorkspaceName(ws.name || "")
            setMembers(list)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load workspace members")
        } finally {
            setIsLoadingMembers(false)
        }
    }

    useEffect(() => {
        refreshMembers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId])

    const sortedMembers = useMemo(() => {
        const list = [...members]
        list.sort((a, b) => {
            if (a.role === "OWNER" && b.role !== "OWNER") return -1
            if (b.role === "OWNER" && a.role !== "OWNER") return 1
            return a.username.localeCompare(b.username)
        })
        return list
    }, [members])

    const changeRole = async (targetUserId: string, role: WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER) => {
        if (!workspaceId) return
        if (!canManageMembers) return
        if (myUserId && targetUserId === myUserId) return

        setUpdatingUserId(targetUserId)
        try {
            await updateWorkspaceMemberRole(workspaceId, targetUserId, role)
            setMembers((prev) => prev.map((m) => (m.user_id === targetUserId ? { ...m, role } : m)))
            toast.success("Role updated")
        } catch (error: any) {
            const message = error?.response?.data?.error || "Failed to update role"
            toast.error(message)
        } finally {
            setUpdatingUserId(null)
        }
    }

    return (
        <div className="flex flex-col p-4" style={{ height: viewHeight }}>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="view-title mb-0">
                        {workspaceName ? workspaceName : "Workspace"}
                    </h1>
                    {currentUser.role ? (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">Your role: {currentUser.role}</div>
                    ) : null}
                </div>
                {currentUser.role === "OWNER" ? (
                    <button
                        type="button"
                        className="rounded-md bg-[var(--secondary)] px-3 py-2 text-sm font-medium text-white"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        Invite
                    </button>
                ) : null}
            </div>
            {/* List of connected users */}
            <Users />

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]/40">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <div className="text-sm font-semibold">Members</div>
                    <button
                        type="button"
                        className="text-xs text-[var(--text-muted)] hover:text-white"
                        onClick={refreshMembers}
                        disabled={isLoadingMembers}
                    >
                        {isLoadingMembers ? "Loading..." : "Refresh"}
                    </button>
                </div>
                <div className="max-h-[260px] overflow-auto divide-y divide-[var(--border)]">
                    {sortedMembers.length === 0 ? (
                        <div className="p-4 text-sm text-[var(--text-muted)]">No members found.</div>
                    ) : (
                        sortedMembers.map((m) => {
                            const isMe = !!myUserId && m.user_id === myUserId
                            const canEditThis = canManageMembers && !isMe && m.role !== "OWNER"
                            return (
                                <div key={m.user_id} className="flex items-center gap-3 p-4">
                                    <div className="h-9 w-9 overflow-hidden rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-sm font-bold">
                                        {m.avatar_url ? (
                                            <img src={m.avatar_url} alt={m.username} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{m.username?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium truncate">{m.username}</div>
                                            {isMe ? (
                                                <span className="text-xs rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-muted)]">
                                                    You
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                                    </div>
                                    {canManageMembers ? (
                                        <select
                                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={m.role}
                                            onChange={(e) =>
                                                changeRole(m.user_id, e.target.value as WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER)
                                            }
                                            disabled={!canEditThis || updatingUserId === m.user_id}
                                            title={m.role === "OWNER" ? "Owner role cannot be changed" : isMe ? "Cannot change your own role" : ""}
                                        >
                                            <option value={WorkspaceRole.COLLABORATOR}>COLLABORATOR</option>
                                            <option value={WorkspaceRole.VIEWER}>VIEWER</option>
                                            {m.role === "OWNER" ? <option value={WorkspaceRole.OWNER}>OWNER</option> : null}
                                        </select>
                                    ) : (
                                        <span className="text-xs rounded-md border border-[var(--border)] px-3 py-2 text-[var(--text-muted)]">
                                            {m.role}
                                        </span>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex w-full gap-4">
                    {/* Share URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md bg-white p-3 text-black"
                        onClick={shareURL}
                        title="Share Link"
                    >
                        <IoShareOutline size={26} />
                    </button>
                    {/* Copy URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md bg-white p-3 text-black"
                        onClick={copyURL}
                        title="Copy Link"
                    >
                        <LuCopy size={22} />
                    </button>
                    {/* Leave room button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md bg-primary p-3 text-black"
                        onClick={leaveRoom}
                        title="Leave room"
                    >
                        <GoSignOut size={22} />
                    </button>
                </div>
            </div>

            {currentUser.roomId ? (
                <InviteModal
                    workspaceId={workspaceId}
                    isOpen={isInviteOpen}
                    onClose={() => setIsInviteOpen(false)}
                />
            ) : null}
        </div>
    )
}

export default UsersView
