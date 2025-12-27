import { inviteToWorkspace, getWorkspaceInvites, getWorkspaceMembers, WorkspaceRole } from "@/api/workspaces"
import { searchUsers, UserSearchResult } from "@/api/users"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

type Props = {
    workspaceId: string
    isOpen: boolean
    onClose: () => void
}

function InviteModal({ workspaceId, isOpen, onClose }: Props) {
    const { user } = useAuth()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<UserSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isLoadingMeta, setIsLoadingMeta] = useState(false)
    const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
    const [selectedRoles, setSelectedRoles] = useState<Record<string, WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER>>({})

    const reset = () => {
        setQuery("")
        setResults([])
        setSelectedRoles({})
    }

    useEffect(() => {
        if (!isOpen) return

        setIsLoadingMeta(true)
        Promise.all([getWorkspaceMembers(workspaceId), getWorkspaceInvites(workspaceId)])
            .then(([members, invites]) => {
                setMemberIds(new Set(members.map((m) => m.user_id)))
                setInvitedIds(new Set(invites.map((i) => i.inviteeId)))
            })
            .catch((err) => {
                console.error(err)
                toast.error("Failed to load invite data")
            })
            .finally(() => setIsLoadingMeta(false))
    }, [isOpen, workspaceId])

    useEffect(() => {
        if (!isOpen) return
        if (query.trim().length < 2) {
            setResults([])
            return
        }

        const handle = setTimeout(async () => {
            setIsSearching(true)
            try {
                const users = await searchUsers(query.trim())
                setResults(users)
            } catch (err) {
                console.error(err)
                setResults([])
            } finally {
                setIsSearching(false)
            }
        }, 300)

        return () => clearTimeout(handle)
    }, [isOpen, query])

    const canInvite = useMemo(() => {
        return (candidate: UserSearchResult) => {
            if (user?.id && candidate.id === user.id) return false
            if (memberIds.has(candidate.id)) return false
            if (invitedIds.has(candidate.id)) return false
            return true
        }
    }, [invitedIds, memberIds, user?.id])

    const handleInvite = async (candidate: UserSearchResult) => {
        const role = selectedRoles[candidate.id] || WorkspaceRole.VIEWER
        try {
            await inviteToWorkspace(workspaceId, candidate.email, role)
            setInvitedIds((prev) => new Set(prev).add(candidate.id))
            toast.success("Invite sent")
        } catch (error: any) {
            const message = error?.response?.data?.error || "Failed to invite user"
            toast.error(message)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    reset()
                    onClose()
                }
            }}
        >
            <div className="w-full max-w-2xl rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold">Invite to Workspace</h3>
                    <button
                        type="button"
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                        onClick={() => {
                            reset()
                            onClose()
                        }}
                    >
                        Close
                    </button>
                </div>

                <div className="mt-5">
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                        Search by username or email
                    </label>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Start typing..."
                        className="w-full rounded-md p-3 focus:ring-2 focus:ring-[var(--secondary)]"
                        autoFocus
                    />
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                        {isLoadingMeta ? "Loading members/invites..." : isSearching ? "Searching..." : null}
                    </div>
                </div>

                <div className="mt-6 max-h-[420px] overflow-auto rounded-lg border border-[var(--border)]">
                    {results.length === 0 ? (
                        <div className="p-6 text-sm text-[var(--text-muted)]">
                            {query.trim().length < 2 ? "Type at least 2 characters to search." : "No users found."}
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {results.map((u) => {
                                const disabled = !canInvite(u)
                                const statusLabel = memberIds.has(u.id) ? "Member" : invitedIds.has(u.id) ? "Invited" : ""
                                const roleValue = selectedRoles[u.id] || WorkspaceRole.VIEWER

                                return (
                                    <div key={u.id} className="flex items-center gap-4 p-4">
                                        <div className="h-10 w-10 overflow-hidden rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-sm font-bold">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.username} className="h-full w-full object-cover" />
                                            ) : (
                                                <span>{u.username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium truncate">{u.username}</div>
                                                {statusLabel ? (
                                                    <span className="text-xs rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-muted)]">
                                                        {statusLabel}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)] truncate">{u.email}</div>
                                        </div>
                                        <select
                                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={roleValue}
                                            onChange={(e) =>
                                                setSelectedRoles((prev) => ({
                                                    ...prev,
                                                    [u.id]: e.target.value as WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER,
                                                }))
                                            }
                                            disabled={disabled}
                                        >
                                            <option value={WorkspaceRole.COLLABORATOR}>COLLABORATOR</option>
                                            <option value={WorkspaceRole.VIEWER}>VIEWER</option>
                                        </select>
                                        <button
                                            type="button"
                                            className="rounded-md bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={disabled}
                                            onClick={() => handleInvite(u)}
                                        >
                                            Invite
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default InviteModal
