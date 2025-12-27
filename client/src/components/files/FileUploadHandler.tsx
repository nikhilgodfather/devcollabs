import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { FileSystemItem } from "@/types/file"
import { useCallback, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"
import { RiFolderUploadLine } from "react-icons/ri"
import cn from "classnames"

interface FileUploadHandlerProps {
    parentDirId: string
    onUploadComplete?: () => void
}

export function FileUploadHandler({
    parentDirId,
    onUploadComplete,
}: FileUploadHandlerProps) {
    const { createFile } = useFileSystem()
    const { socket } = useSocket()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleFileSelect = useCallback(
        async (files: FileList) => {
            if (files.length === 0) return

            const loadingToast = toast.loading(
                `Uploading ${files.length} file(s)...`,
            )

            try {
                const promises: Promise<void>[] = []

                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    promises.push(
                        new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = async (e) => {
                                try {
                                    const content = e.target?.result as string

                                    const newFile: FileSystemItem = {
                                        id: uuidv4(),
                                        name: file.name,
                                        type: "file",
                                        content,
                                    }

                                    // Create file locally (emits socket event automatically)
                                    ;(createFile as any)(parentDirId, newFile)

                                    resolve()
                                } catch (error) {
                                    console.error(
                                        `Error processing ${file.name}:`,
                                        error,
                                    )
                                    resolve()
                                }
                            }
                            reader.readAsText(file)
                        }),
                    )
                }

                await Promise.all(promises)

                toast.dismiss(loadingToast)
                toast.success(`${files.length} file(s) uploaded successfully`)
                onUploadComplete?.()

                // Clear input
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
            } catch (error) {
                toast.dismiss(loadingToast)
                toast.error("Error uploading files")
                console.error(error)
            }
        },
        [parentDirId, createFile, socket, onUploadComplete],
    )

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)

            const files = e.dataTransfer.files
            if (files && files.length > 0) {
                handleFileSelect(files)
            }
        },
        [handleFileSelect],
    )

    return (
        <div
            className={cn(
                "relative rounded border-2 border-dashed p-4 transition-all duration-200",
                isDragging
                    ? "border-blue-500 bg-blue-500/10 dark:bg-blue-900/20"
                    : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) {
                        handleFileSelect(e.target.files)
                    }
                }}
            />

            <div className="flex flex-col items-center justify-center gap-2 py-2">
                <RiFolderUploadLine
                    size={28}
                    className={cn(
                        "transition-colors",
                        isDragging
                            ? "text-blue-500"
                            : "text-gray-400 dark:text-gray-500",
                    )}
                />
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Drag files here
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        or{" "}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            click to browse
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default FileUploadHandler
