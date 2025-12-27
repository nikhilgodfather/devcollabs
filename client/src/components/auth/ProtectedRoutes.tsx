import { useAuth } from "@/context/AuthContext"
import { Navigate, Outlet } from "react-router-dom"

const ProtectedRoutes = () => {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-white">
                <div className="text-center">
                    <div className="mb-4">Loading...</div>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}

export default ProtectedRoutes
