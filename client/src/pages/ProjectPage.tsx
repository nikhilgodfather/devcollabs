import { getProject } from "@/api/projects"
import { createWorkspace, getWorkspaces, Workspace, updateWorkspace, deleteWorkspace } from "@/api/workspaces"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Link, useParams } from "react-router-dom"
import { FiEdit2, FiTrash2, FiMoreVertical, FiArrowRight } from "react-icons/fi"

const ProjectPage = () => {
    const { projectId } = useParams<{ projectId: string }>()
    const { user } = useAuth()
    const [project, setProject] = useState<any>(null)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
    const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
    const [openMenu, setOpenMenu] = useState<string | null>(null)

    useEffect(() => {
        if (projectId) {
            loadData()
        }
    }, [projectId])

    const loadData = async () => {
        try {
            const [projData, workData] = await Promise.all([
                getProject(projectId!),
                getWorkspaces(projectId!)
            ])
            setProject(projData)
            setWorkspaces(workData)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load project details")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWorkspaceName.trim()) return

        setIsCreating(true)
        try {
            await createWorkspace(projectId!, newWorkspaceName)
            toast.success("Workspace created!")
            setNewWorkspaceName("")
            setShowCreateModal(false)
            loadData()
        } catch (error) {
            toast.error("Failed to create workspace")
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditWorkspace = (workspace: Workspace) => {
        setEditingWorkspace(workspace)
        setNewWorkspaceName(workspace.name)
        setOpenMenu(null)
        setShowEditModal(true)
    }

    const handleUpdateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingWorkspace || !newWorkspaceName.trim()) return

        setIsUpdating(true)
        try {
            await updateWorkspace(editingWorkspace.id, newWorkspaceName)
            toast.success("Workspace updated!")
            setShowEditModal(false)
            setEditingWorkspace(null)
            setNewWorkspaceName("")
            loadData()
        } catch (error) {
            toast.error("Failed to update workspace")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteWorkspace = (workspace: Workspace) => {
        setDeletingWorkspace(workspace)
        setOpenMenu(null)
        setShowDeleteConfirm(true)
    }

    const confirmDeleteWorkspace = async () => {
        if (!deletingWorkspace) return

        setIsDeleting(true)
        try {
            await deleteWorkspace(deletingWorkspace.id)
            toast.success("Workspace deleted!")
            setShowDeleteConfirm(false)
            setDeletingWorkspace(null)
            loadData()
        } catch (error) {
            toast.error("Failed to delete workspace")
        } finally {
            setIsDeleting(false)
        }
    }

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            // Don't close if clicking on the menu button or menu itself
            if (target.closest('.menu-button') || target.closest('.menu-dropdown')) {
                return
            }
            setOpenMenu(null)
        }
        if (openMenu) {
            // Use setTimeout to avoid immediate closure
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside)
            }, 0)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [openMenu])

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-dark text-white">Loading...</div>
    if (!project) return <div className="flex h-screen items-center justify-center bg-dark text-white">Project not found</div>

    const isOwner = user?.id === project.ownerId

    return (
        <div className="flex min-h-screen flex-col bg-dark text-white">
            <nav className="flex items-center gap-4 border-b border-darkHover bg-darkHover p-4 shadow-sm">
                <Link to="/" className="text-gray-400 hover:text-white">← Back to Dashboard</Link>
                <div className="h-6 w-[1px] bg-gray-600"></div>
                <h1 className="text-lg font-bold">{project.name}</h1>
            </nav>

            <div className="container mx-auto p-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">Workspaces</h2>
                        <p className="mt-1 text-gray-400">Collaborative environments in this project</p>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="rounded-md bg-primary px-6 py-2 font-bold text-black transition hover:bg-primary/90"
                        >
                            New Workspace
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workspaces.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            No workspaces yet.
                        </div>
                    ) : (
                        workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                className="relative flex flex-col justify-between rounded-lg border border-transparent bg-darkHover p-6 shadow-md transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
                            >
                                {isOwner && (
                                    <div className="absolute top-4 right-4">
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setOpenMenu(openMenu === ws.id ? null : ws.id)
                                                }}
                                                className="menu-button p-2 rounded-md hover:bg-gray-700 transition-colors bg-gray-800 border border-gray-700"
                                                type="button"
                                            >
                                                <FiMoreVertical className="text-gray-300" size={18} />
                                            </button>
                                            {openMenu === ws.id && (
                                                <div className="menu-dropdown absolute right-0 mt-2 w-40 bg-darkHover border border-gray-700 rounded-lg shadow-xl z-50">
                                                    <Link
                                                        to={`/workspace/${ws.id}`}
                                                        className="block px-4 py-2 text-sm hover:bg-gray-700 rounded-t-lg"
                                                        onClick={() => setOpenMenu(null)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <FiArrowRight /> Open
                                                        </div>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleEditWorkspace(ws)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <FiEdit2 /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteWorkspace(ws)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-500 rounded-b-lg flex items-center gap-2"
                                                    >
                                                        <FiTrash2 /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <Link
                                    to={`/workspace/${ws.id}`}
                                    className="flex-1 flex flex-col justify-between"
                                >
                                    <h3 className="mb-2 text-xl font-bold">{ws.name}</h3>
                                    <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                                        <span>Open Editor →</span>
                                    </div>
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Workspace Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-darkHover p-6 shadow-xl border border-gray-700">
                        <h3 className="mb-4 text-xl font-bold">Create New Workspace</h3>
                        <form onSubmit={handleCreateWorkspace}>
                            <input
                                type="text"
                                placeholder="Workspace Name"
                                autoFocus
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                className="mb-4 w-full rounded-md border border-gray-600 bg-dark p-3 text-white focus:border-primary focus:outline-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false)
                                        setNewWorkspaceName("")
                                    }}
                                    className="rounded-md px-4 py-2 text-gray-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newWorkspaceName.trim() || isCreating}
                                    className="rounded-md bg-primary px-6 py-2 font-bold text-black disabled:opacity-50"
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Workspace Modal */}
            {showEditModal && editingWorkspace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-darkHover p-6 shadow-xl border border-gray-700">
                        <h3 className="mb-4 text-xl font-bold">Edit Workspace</h3>
                        <form onSubmit={handleUpdateWorkspace}>
                            <input
                                type="text"
                                placeholder="Workspace Name"
                                autoFocus
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                className="mb-4 w-full rounded-md border border-gray-600 bg-dark p-3 text-white focus:border-primary focus:outline-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false)
                                        setEditingWorkspace(null)
                                        setNewWorkspaceName("")
                                    }}
                                    className="rounded-md px-4 py-2 text-gray-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newWorkspaceName.trim() || isUpdating}
                                    className="rounded-md bg-primary px-6 py-2 font-bold text-black disabled:opacity-50"
                                >
                                    {isUpdating ? "Updating..." : "Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Workspace Confirmation */}
            {showDeleteConfirm && deletingWorkspace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-darkHover p-6 shadow-xl border border-gray-700">
                        <h3 className="mb-4 text-xl font-bold text-red-500">Delete Workspace</h3>
                        <p className="mb-6 text-gray-400">
                            Are you sure you want to delete <span className="font-semibold text-white">{deletingWorkspace.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeletingWorkspace(null)
                                }}
                                className="rounded-md px-4 py-2 text-gray-300 hover:text-white"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteWorkspace}
                                disabled={isDeleting}
                                className="rounded-md bg-red-600 px-6 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
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

export default ProjectPage
