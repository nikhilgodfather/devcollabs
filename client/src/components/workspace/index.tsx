import { useAppContext } from "@/context/AppContext"
import useResponsive from "@/hooks/useResponsive"
import EditorComponent from "../editor/EditorComponent"

function WorkSpace() {
    const { viewHeight } = useResponsive()

    return (
        <div
            className="absolute left-0 top-0 w-full max-w-full flex-grow overflow-x-hidden md:static"
            style={{ height: viewHeight }}
        >
            <EditorComponent />
        </div>
    )
}

export default WorkSpace
