import { createProject, getProjects, updateProject, deleteProject, Project } from "@/api/projects"
import { getAllWorkspaces, Workspace, createWorkspace, updateWorkspace, deleteWorkspace } from "@/api/workspaces"
import { acceptNotification, declineNotification, getNotifications, Notification } from "@/api/notifications"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import { Link, useNavigate } from "react-router-dom"
import { FiPlus, FiLogOut, FiBox, FiCodepen, FiArrowRight, FiEdit2, FiTrash2, FiMoreVertical, FiBell, FiUserPlus } from "react-icons/fi"
import logo from "@/assets/devcollab-logo.svg"
import InviteModal from "@/components/workspace/InviteModal"

const DashboardPage = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [projects, setProjects] = useState<Project[]>([])
    const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // Modals
    const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
    const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
    const [showEditProjectModal, setShowEditProjectModal] = useState(false)
    const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false)
    const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false)
    const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false)
    
    // Form States
    const [newProjectName, setNewProjectName] = useState("")
    const [newProjectDescription, setNewProjectDescription] = useState("")
    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    
    // Edit States
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
    const [deletingProject, setDeletingProject] = useState<Project | null>(null)
    const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
    
    // Menu States
    const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null)
    const [openWorkspaceMenu, setOpenWorkspaceMenu] = useState<string | null>(null)

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

    const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string | null>(null)
     
    const [isCreating, setIsCreating] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false)
    const fetchProjectsRef = useRef(false)
    const fetchWorkspacesRef = useRef(false)

    const fetchNotifications = async (silent = false) => {
        if (!silent) setIsLoadingNotifications(true)
        try {
            const data = await getNotifications()
            setNotifications(data.notifications)
            setUnreadCount(data.unreadCount)
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        } finally {
            if (!silent) setIsLoadingNotifications(false)
        }
    }

    // Fetch projects independently
    const fetchProjects = async (silent = false) => {
        if (!silent) setIsLoading(true)
        try {
            const projectsData = await getProjects()
            setProjects(projectsData)
            return projectsData
        } catch (error) {
            console.error("Failed to fetch projects", error)
            toast.error("Failed to load projects")
            throw error
        } finally {
            if (!silent) setIsLoading(false)
            fetchProjectsRef.current = false
        }
    }

    // Fetch workspaces independently - completely separate from projects
    const fetchWorkspaces = async (silent = false) => {
        if (!silent) setIsLoadingWorkspaces(true)
        try {
            // Fetch all workspaces for the user (independent of projects)
            const workspaces = await getAllWorkspaces()
            setAllWorkspaces(workspaces)
        } catch (error) {
            console.error("Failed to fetch workspaces", error)
            toast.error("Failed to load workspaces")
        } finally {
            if (!silent) setIsLoadingWorkspaces(false)
            fetchWorkspacesRef.current = false
        }
    }

    // Initial data load - fetch projects and workspaces completely independently
    useEffect(() => {
        if (fetchProjectsRef.current || fetchWorkspacesRef.current) return
        fetchProjectsRef.current = true
        fetchWorkspacesRef.current = true
        
        // Fetch both independently and in parallel
        Promise.all([
            fetchProjects(),
            fetchWorkspaces(true)
        ]).catch(error => {
            console.error("Failed to load initial data", error)
        })
    }, [])

    useEffect(() => {
        fetchNotifications(true).catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            // Don't close if clicking on the menu button or menu itself
            if (
                target.closest('.menu-button') ||
                target.closest('.menu-dropdown') ||
                target.closest('.notifications-button') ||
                target.closest('.notifications-panel')
            ) {
                return
            }
            setOpenProjectMenu(null)
            setOpenWorkspaceMenu(null)
            setShowNotifications(false)
        }
        if (openProjectMenu || openWorkspaceMenu || showNotifications) {
            // Use setTimeout to avoid immediate closure
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside)
            }, 0)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [openProjectMenu, openWorkspaceMenu, showNotifications])

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newProjectName.trim()) return

        setIsCreating(true)
        try {
            await createProject(newProjectName, newProjectDescription || undefined)
            toast.success("Project created!")
            setNewProjectName("")
            setNewProjectDescription("")
            setShowCreateProjectModal(false)
            // Refresh projects only
            await fetchProjects(true)
            // Workspaces are independent, no need to refresh
        } catch (error) {
            toast.error("Failed to create project")
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditProject = (project: Project) => {
        setEditingProject(project)
        setNewProjectName(project.name)
        setNewProjectDescription(project.description || "")
        setOpenProjectMenu(null)
        setShowEditProjectModal(true)
    }

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingProject || !newProjectName.trim()) return

        setIsUpdating(true)
        try {
            await updateProject(editingProject.id, newProjectName, newProjectDescription || undefined)
            toast.success("Project updated!")
            setShowEditProjectModal(false)
            setEditingProject(null)
            setNewProjectName("")
            setNewProjectDescription("")
            // Refresh projects only
            await fetchProjects(true)
            // Workspaces don't need refresh for project update
        } catch (error) {
            toast.error("Failed to update project")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteProject = (project: Project) => {
        setDeletingProject(project)
        setOpenProjectMenu(null)
        setShowDeleteProjectConfirm(true)
    }

    const confirmDeleteProject = async () => {
        if (!deletingProject) return

        setIsDeleting(true)
        try {
            await deleteProject(deletingProject.id)
            toast.success("Project deleted!")
            setShowDeleteProjectConfirm(false)
            setDeletingProject(null)
            // Refresh projects and workspaces independently
            await fetchProjects(true)
            await fetchWorkspaces(true)
        } catch (error) {
            toast.error("Failed to delete project")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWorkspaceName.trim()) return

        setIsCreating(true)
        try {
            await createWorkspace(newWorkspaceName)
            toast.success("Workspace created!")
            setNewWorkspaceName("")
            setShowCreateWorkspaceModal(false)
            // Refresh workspaces only (independent of projects)
            await fetchWorkspaces(true)
        } catch (error) {
            toast.error("Failed to create workspace")
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditWorkspace = (workspace: Workspace) => {
        setEditingWorkspace(workspace)
        setNewWorkspaceName(workspace.name)
        setOpenWorkspaceMenu(null)
        setShowEditWorkspaceModal(true)
    }

    const handleUpdateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingWorkspace || !newWorkspaceName.trim()) return

        setIsUpdating(true)
        try {
            await updateWorkspace(editingWorkspace.id, newWorkspaceName)
            toast.success("Workspace updated!")
            setShowEditWorkspaceModal(false)
            setEditingWorkspace(null)
            setNewWorkspaceName("")
            // Refresh workspaces only (independent of projects)
            await fetchWorkspaces(true)
        } catch (error) {
            toast.error("Failed to update workspace")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteWorkspace = (workspace: Workspace) => {
        setDeletingWorkspace(workspace)
        setOpenWorkspaceMenu(null)
        setShowDeleteWorkspaceConfirm(true)
    }

    const confirmDeleteWorkspace = async () => {
        if (!deletingWorkspace) return

        setIsDeleting(true)
        try {
            await deleteWorkspace(deletingWorkspace.id)
            toast.success("Workspace deleted!")
            setShowDeleteWorkspaceConfirm(false)
            setDeletingWorkspace(null)
            // Refresh workspaces only (independent of projects)
            await fetchWorkspaces(true)
        } catch (error) {
            toast.error("Failed to delete workspace")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    const pendingInviteNotifications = notifications.filter(
        (n) => n.type === "WORKSPACE_INVITE" && n.status === "PENDING",
    )

    const handleAcceptInvite = async (notificationId: string) => {
        try {
            await acceptNotification(notificationId)
            toast.success("Invite accepted")
            await fetchNotifications(true)
            await fetchWorkspaces(true)
        } catch (error: any) {
            const message = error?.response?.data?.error || "Failed to accept invite"
            toast.error(message)
        }
    }

    const handleDeclineInvite = async (notificationId: string) => {
        try {
            await declineNotification(notificationId)
            toast.success("Invite declined")
            await fetchNotifications(true)
        } catch (error: any) {
            const message = error?.response?.data?.error || "Failed to decline invite"
            toast.error(message)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text-main)] font-[IBM_Plex_Sans]">
            {/* Header */}
            <nav className="flex items-center justify-between border-b border-[var(--border)] bg-[#0e0e11]/80 p-5 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="DevCollab Logo" className="h-8 w-auto" />
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-[var(--text-muted)] text-sm hidden sm:block">Welcome, <span className="text-white font-medium">{user?.username}</span></span>
                    <div className="relative">
                        <button
                            type="button"
                            className="notifications-button relative flex items-center justify-center rounded-md border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors"
                            onClick={async () => {
                                const next = !showNotifications
                                setShowNotifications(next)
                                if (next) {
                                    await fetchNotifications()
                                }
                            }}
                            title="Notifications"
                        >
                            <FiBell />
                            {unreadCount > 0 ? (
                                <span className="absolute -top-1 -right-1 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            ) : null}
                        </button>
                        {showNotifications ? (
                            <div className="notifications-panel absolute right-0 mt-2 w-96 max-w-[90vw] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                                    <div className="font-semibold">Notifications</div>
                                    <button
                                        type="button"
                                        className="text-sm text-[var(--text-muted)] hover:text-white"
                                        onClick={() => setShowNotifications(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="max-h-[420px] overflow-auto">
                                    {isLoadingNotifications ? (
                                        <div className="p-4 text-sm text-[var(--text-muted)]">Loading...</div>
                                    ) : pendingInviteNotifications.length === 0 ? (
                                        <div className="p-4 text-sm text-[var(--text-muted)]">No pending notifications.</div>
                                    ) : (
                                        <div className="divide-y divide-[var(--border)]">
                                            {pendingInviteNotifications.map((n) => (
                                                <div key={n.id} className="p-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium">
                                                            Workspace invite: <span className="text-white">{n.payload.workspaceName}</span>
                                                        </div>
                                                        <div className="text-[var(--text-muted)]">
                                                            Invited by {n.payload.invitedBy.username} as{" "}
                                                            <span className="text-white">{n.payload.role}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="rounded-md bg-[var(--secondary)] px-3 py-2 text-sm font-medium text-white"
                                                            onClick={() => handleAcceptInvite(n.id)}
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                                                            onClick={() => handleDeclineInvite(n.id)}
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                    >
                        <FiLogOut /> Logout
                    </button>
                </div>
            </nav>

            <div className="container mx-auto p-6 md:p-10 space-y-16 animate-fade-in">
                
                {/* PROJECTS SECTION */}
                <section>
                    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <FiBox className="text-[var(--primary)]" />
                                Projects
                            </h2>
                            <p className="text-[var(--text-muted)] mt-1">Solo coding with file import and editor - work independently.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateProjectModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <FiPlus /> New Project
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[1,2,3].map(i => <div key={i} className="h-40 bg-[var(--surface)] animate-pulse rounded-lg border border-[var(--border)]"></div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {projects.length === 0 ? (
                                <div className="col-span-full border-2 border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-12 text-center rounded-xl">
                                    <p className="text-[var(--text-muted)] mb-4">No projects yet.</p>
                                    <button onClick={() => setShowCreateProjectModal(true)} className="text-[var(--primary)] hover:underline">Create your first project</button>
                                </div>
                            ) : (
                                projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="card group relative flex h-48 flex-col justify-between rounded-xl p-6"
                                    >
                                        <div className="absolute top-4 right-4 z-20">
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setOpenProjectMenu(openProjectMenu === project.id ? null : project.id)
                                                    }}
                                                    className="menu-button p-2 rounded-md hover:bg-[var(--surface-hover)] transition-colors bg-[var(--surface)]/80 backdrop-blur-sm border border-[var(--border)]"
                                                    type="button"
                                                >
                                                    <FiMoreVertical className="text-[var(--text-main)]" size={18} />
                                                </button>
                                                {openProjectMenu === project.id && (
                                                    <div className="menu-dropdown absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50">
                                                        <Link
                                                            to={`/project/${project.id}`}
                                                            className="block px-4 py-2 text-sm hover:bg-[var(--surface-hover)] rounded-t-lg transition-colors"
                                                            onClick={() => setOpenProjectMenu(null)}
                                                        >
                                                            <div className="flex items-center gap-2 text-[var(--text-main)]">
                                                                <FiArrowRight size={14} /> Open
                                                            </div>
                                                        </Link>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                handleEditProject(project)
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)] flex items-center gap-2 text-[var(--text-main)] transition-colors"
                                                            type="button"
                                                        >
                                                            <FiEdit2 size={14} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                handleDeleteProject(project)
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--danger)] rounded-b-lg flex items-center gap-2 transition-colors"
                                                            type="button"
                                                        >
                                                            <FiTrash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            to={`/project/${project.id}`}
                                            className="flex-1 flex flex-col justify-between"
                                            onClick={() => setOpenProjectMenu(null)}
                                        >
                                            <div>
                                                <h3 className="mb-2 text-xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="line-clamp-2 text-sm text-[var(--text-muted)]">
                                                    {project.description || "Solo Scratchpad"}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between mt-4">
                                                 <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-hover)] px-2 py-1 rounded">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                 </span>
                                                 <FiArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--primary)]" />
                                            </div>
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>

                {/* WORKSPACES SECTION */}
                <section>
                     <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <FiCodepen className="text-[var(--secondary)]" />
                                Workspaces
                            </h2>
                             <p className="text-[var(--text-muted)] mt-1">Real-time collaborative environments.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateWorkspaceModal(true)}
                            className="bg-[var(--secondary)] text-white font-bold py-2 px-6 rounded-md hover:bg-[#8535db] transition-colors flex items-center gap-2"
                        >
                            <FiPlus /> New Workspace
                        </button>
                    </div>

                    {isLoading || isLoadingWorkspaces ? (
                        <div className="text-[var(--text-muted)]">Loading workspaces...</div>
                    ) : (
                         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {allWorkspaces.length === 0 ? (
                               <div className="col-span-full border-2 border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-12 text-center rounded-xl">
                                    <p className="text-[var(--text-muted)]">No workspaces yet.</p>
                                </div>
                            ) : (
                                allWorkspaces.map((ws) => {
                                    const isOwner = ws.user_role === "OWNER"
                                    const showActions = isOwner
                                    return (
                                        <div
                                            key={ws.id}
                                            className="card group relative flex h-40 flex-col justify-between rounded-xl p-6 border-l-4 border-l-[var(--secondary)]"
                                        >
                                        <div className="absolute top-4 right-4 z-20">
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setOpenWorkspaceMenu(openWorkspaceMenu === ws.id ? null : ws.id)
                                                    }}
                                                    className="menu-button p-2 rounded-md hover:bg-[var(--surface-hover)] transition-colors bg-[var(--surface)]/80 backdrop-blur-sm border border-[var(--border)]"
                                                    type="button"
                                                >
                                                    <FiMoreVertical className="text-[var(--text-main)]" size={18} />
                                                </button>
                                                {openWorkspaceMenu === ws.id && (
                                                    <div className="menu-dropdown absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50">
                                                        <Link
                                                            to={`/workspace/${ws.id}`}
                                                            className={`block px-4 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors ${
                                                                showActions ? "rounded-t-lg" : "rounded-lg"
                                                            }`}
                                                            onClick={() => setOpenWorkspaceMenu(null)}
                                                        >
                                                            <div className="flex items-center gap-2 text-[var(--text-main)]">
                                                                <FiArrowRight size={14} /> Open
                                                            </div>
                                                        </Link>
                                                        {isOwner ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setOpenWorkspaceMenu(null)
                                                                    setInviteWorkspaceId(ws.id)
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)] flex items-center gap-2 text-[var(--text-main)] transition-colors"
                                                                type="button"
                                                            >
                                                                <FiUserPlus size={14} /> Invite
                                                            </button>
                                                        ) : null}
                                                        {isOwner ? (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        handleEditWorkspace(ws)
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)] flex items-center gap-2 text-[var(--text-main)] transition-colors"
                                                                    type="button"
                                                                >
                                                                    <FiEdit2 size={14} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        handleDeleteWorkspace(ws)
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--danger)] rounded-b-lg flex items-center gap-2 transition-colors"
                                                                    type="button"
                                                                >
                                                                    <FiTrash2 size={14} /> Delete
                                                                </button>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            to={`/workspace/${ws.id}`}
                                            className="flex-1 flex flex-col justify-between"
                                            onClick={() => setOpenWorkspaceMenu(null)}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <h3 className="text-lg font-bold group-hover:text-[var(--secondary)] transition-colors truncate">
                                                        {ws.name}
                                                    </h3>
                                                    {ws.user_role ? (
                                                        <span className="text-[10px] uppercase font-bold rounded px-2 py-0.5 border border-[var(--border)] text-[var(--text-muted)]">
                                                            {ws.user_role}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    Real-time Collaboration
                                                </p>
                                            </div>
                                            <div className="flex justify-end items-center">
                                                <span className="text-[var(--secondary)] text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    Enter <FiArrowRight />
                                                </span>
                                            </div>
                                        </Link>
                                    </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </section>
            </div>

            {inviteWorkspaceId ? (
                <InviteModal
                    workspaceId={inviteWorkspaceId}
                    isOpen={!!inviteWorkspaceId}
                    onClose={() => setInviteWorkspaceId(null)}
                />
            ) : null}

            {/* Create Project Modal */}
            {showCreateProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-6 text-2xl font-bold">Create New Project</h3>
                        <form onSubmit={handleCreateProject}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. My Awesome App"
                                    autoFocus
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full rounded-md p-3 focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Description (Optional)</label>
                                <textarea
                                    placeholder="Project description..."
                                    value={newProjectDescription}
                                    onChange={(e) => setNewProjectDescription(e.target.value)}
                                    className="w-full rounded-md p-3 focus:ring-2 focus:ring-[var(--primary)]"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateProjectModal(false)
                                        setNewProjectName("")
                                        setNewProjectDescription("")
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProjectName.trim() || isCreating}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditProjectModal && editingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-6 text-2xl font-bold">Edit Project</h3>
                        <form onSubmit={handleUpdateProject}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. My Awesome App"
                                    autoFocus
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full rounded-md p-3 focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Description (Optional)</label>
                                <textarea
                                    placeholder="Project description..."
                                    value={newProjectDescription}
                                    onChange={(e) => setNewProjectDescription(e.target.value)}
                                    className="w-full rounded-md p-3 focus:ring-2 focus:ring-[var(--primary)]"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditProjectModal(false)
                                        setEditingProject(null)
                                        setNewProjectName("")
                                        setNewProjectDescription("")
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProjectName.trim() || isUpdating}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? "Updating..." : "Update Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Project Confirmation */}
            {showDeleteProjectConfirm && deletingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-4 text-2xl font-bold text-[var(--danger)]">Delete Project</h3>
                        <p className="mb-6 text-[var(--text-muted)]">
                            Are you sure you want to delete <span className="font-semibold text-white">{deletingProject.name}</span>? This action cannot be undone and will delete all associated workspaces.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteProjectConfirm(false)
                                    setDeletingProject(null)
                                }}
                                className="btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteProject}
                                disabled={isDeleting}
                                className="bg-[var(--danger)] text-white font-bold py-2 px-6 rounded-md hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Workspace Modal */}
            {showCreateWorkspaceModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-6 text-2xl font-bold">Create New Workspace</h3>
                        <p className="mb-4 text-sm text-[var(--text-muted)]">Create a real-time collaborative workspace for team coding.</p>
                        <form onSubmit={handleCreateWorkspace}>
                             <div className="mb-6">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Workspace Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Team Backend Dev"
                                    autoFocus
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    className="w-full rounded-md p-3"
                                />
                             </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateWorkspaceModal(false)
                                        setNewWorkspaceName("")
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newWorkspaceName.trim() || isCreating}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--secondary)', color: 'white' }}
                                >
                                    {isCreating ? "Creating..." : "Create Workspace"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Workspace Modal */}
            {showEditWorkspaceModal && editingWorkspace && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-6 text-2xl font-bold">Edit Workspace</h3>
                        <form onSubmit={handleUpdateWorkspace}>
                             <div className="mb-6">
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Workspace Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Backend Dev"
                                    autoFocus
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    className="w-full rounded-md p-3"
                                />
                             </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditWorkspaceModal(false)
                                        setEditingWorkspace(null)
                                        setNewWorkspaceName("")
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newWorkspaceName.trim() || isUpdating}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--secondary)', color: 'white' }}
                                >
                                    {isUpdating ? "Updating..." : "Update Workspace"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Workspace Confirmation */}
            {showDeleteWorkspaceConfirm && deletingWorkspace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]">
                        <h3 className="mb-4 text-2xl font-bold text-[var(--danger)]">Delete Workspace</h3>
                        <p className="mb-6 text-[var(--text-muted)]">
                            Are you sure you want to delete <span className="font-semibold text-white">{deletingWorkspace.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteWorkspaceConfirm(false)
                                    setDeletingWorkspace(null)
                                }}
                                className="btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteWorkspace}
                                disabled={isDeleting}
                                className="bg-[var(--danger)] text-white font-bold py-2 px-6 rounded-md hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DashboardPage
