import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import Toast from "./components/toast/Toast"
import EditorPage from "./pages/EditorPage"
import DashboardPage from "./pages/DashboardPage"
// import ProjectPage from "./pages/ProjectPage" // Legacy page
import ProjectEditorPage from "./pages/ProjectEditorPage" // New Solo Scratchpad
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ProtectedRoutes from "./components/auth/ProtectedRoutes"
import { AuthProvider } from "./context/AuthContext"

import SafeErrorBoundary from "./components/SafeErrorBoundary"

const App = () => {
    return (
        <SafeErrorBoundary>
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoutes />}>
                           <Route path="/" element={<DashboardPage />} />
                           {/* Project (Solo Scratchpad) */}
                           <Route path="/project/:projectId" element={<ProjectEditorPage />} />
                           {/* Workspace (Real-time) */}
                           <Route path="/workspace/:roomId" element={<EditorPage />} />
                           {/* Legacy support or alias for direct link access if any */}
                           <Route path="/editor/:roomId" element={<EditorPage />} />
                        </Route>
                    </Routes>
                </Router>
                <Toast /> {/* Toast component from react-hot-toast */}
            </AuthProvider>
        </SafeErrorBoundary>
    )
}

export default App
