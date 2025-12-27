import SplitterComponent from "@/components/SplitterComponent"
import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import Sidebar from "@/components/sidebar/Sidebar"
import WorkSpace from "@/components/workspace"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS, User } from "@/types/user"
import { useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { joinWorkspace } from "@/api/workspaces"
import { toast } from "react-hot-toast"

function EditorPage() {
    // Listen user online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, setCurrentUser, currentUser } = useAppContext()
    const { socket } = useSocket()

    const joiningRef = useRef(false) // Prevent double join
    const joinedRef = useRef("") // Track joined room

    useEffect(() => {
        const init = async () => {
             // If already joined this room, skip
             if (joinedRef.current === roomId) return
             if (!roomId) return

             // Prevent multiple concurrent join attempts
             if (joiningRef.current) return
             joiningRef.current = true

             try {
                 const { role } = await joinWorkspace(roomId)
                 joinedRef.current = roomId
                 
                 // Initial user setup with role
                 const updatedUser: User = { 
                     username: currentUser.username || "Guest", 
                     roomId,
                     role
                 }
                 setCurrentUser(updatedUser)
                 socket.emit(SocketEvent.JOIN_REQUEST, updatedUser)
                 toast.success("Joined workspace")
             } catch (error) {
                 console.error(error)
                 toast.error("Failed to join workspace")
                 navigate("/")
             } finally {
                 joiningRef.current = false
             }
        }
        init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]) // Only depend on roomId to prevent unnecessary re-runs

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    return (
        <SplitterComponent>
            <Sidebar />
            <WorkSpace/>
        </SplitterComponent>
    )
}

export default EditorPage
