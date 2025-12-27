import { Component, ErrorInfo, ReactNode } from "react"
import { FiAlertTriangle } from "react-icons/fi"

interface Props {
    children?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

class SafeErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0e0e11] text-white p-4 text-center">
                    <FiAlertTriangle className="text-6xl text-[var(--danger)] mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-[var(--text-muted)] mb-6 max-w-md">
                        We encountered an unexpected error. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary"
                    >
                        Refresh Page
                    </button>
                    {this.state.error && (
                        <pre className="mt-8 p-4 bg-black/30 rounded text-xs text-left max-w-2xl overflow-auto text-red-300 border border-red-900/30">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}

export default SafeErrorBoundary
