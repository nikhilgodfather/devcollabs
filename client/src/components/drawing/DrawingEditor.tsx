import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { SocketEvent } from "@/types/socket"
import { useCallback, useEffect, useRef } from "react"
import { HistoryEntry, TLRecord, Tldraw, useEditor } from "tldraw"
import { toast } from "react-hot-toast"

function DrawingEditor() {
    const { isMobile } = useWindowDimensions()

    return (
        <Tldraw
            inferDarkMode
            forceMobile={isMobile}
            defaultName="Editor"
            className="z-0"
        >
            <ReachEditor />
        </Tldraw>
    )
}

function ReachEditor() {
    const editor = useEditor()
    const { drawingData, setDrawingData, currentUser } = useAppContext()
    const { socket } = useSocket()
    const lastDeniedAtRef = useRef<number>(0)
    const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleChangeEvent = useCallback(
        (_change: HistoryEntry<TLRecord>) => {
            if (currentUser.role === "VIEWER") {
                const now = Date.now()
                if (now - lastDeniedAtRef.current > 2000) {
                    lastDeniedAtRef.current = now
                    toast.error(
                        "You are a VIEWER and don't have permission to draw.",
                    )
                }
                return
            }
            // Get the full snapshot
            const fullSnapshot = editor.store.getSnapshot()
            setDrawingData(fullSnapshot)

            // Debounce the socket emission to avoid flooding
            if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current)
            }

            drawingTimeoutRef.current = setTimeout(() => {
                socket.emit(SocketEvent.DRAWING_UPDATE, {
                    snapshot: fullSnapshot,
                })
            }, 50) // Emit after 50ms of inactivity
        },
        [currentUser.role, editor.store, setDrawingData, socket],
    )

    // Handle drawing updates from other clients
    const handleRemoteDrawing = useCallback(
        ({ snapshot }: { snapshot: any }) => {
            try {
                editor.store.loadSnapshot(snapshot)
                setDrawingData(snapshot)
            } catch (error) {
                console.error("Error applying drawing snapshot:", error)
            }
        },
        [editor.store, setDrawingData],
    )

    useEffect(() => {
        // Load the drawing data from the context when it first arrives
        if (drawingData && Object.keys(drawingData).length > 0) {
            try {
                editor.store.loadSnapshot(drawingData)
            } catch (error) {
                console.error("Error loading drawing snapshot:", error)
            }
        }
    }, [drawingData, editor.store])

    useEffect(() => {
        editor.updateInstanceState({
            isReadonly: currentUser.role === "VIEWER",
        })
    }, [currentUser.role, editor])

    useEffect(() => {
        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            source: "user",
            scope: "document",
        })

        // Listen for drawing updates from other clients
        socket.on(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)

        // Listen for drawing sync on join
        const handleDrawingSync = ({ drawingData }: { drawingData: any }) => {
            if (drawingData && Object.keys(drawingData).length > 0) {
                editor.store.loadSnapshot(drawingData)
                setDrawingData(drawingData)
            }
        }
        socket.on(SocketEvent.SYNC_DRAWING, handleDrawingSync)

        // Cleanup
        return () => {
            cleanupFunction()
            socket.off(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)
            socket.off(SocketEvent.SYNC_DRAWING, handleDrawingSync)
        }
    }, [
        editor.store,
        handleChangeEvent,
        handleRemoteDrawing,
        socket,
        setDrawingData,
    ])

    return null
}

export default DrawingEditor
