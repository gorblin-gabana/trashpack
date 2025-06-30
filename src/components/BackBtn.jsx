import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BackBtn({ customPath = "/" }) {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(customPath || "/");
    };

    return (
        <button
            onClick={handleBack}
            className="flex items-center gap-2 w-fit text-zinc-400 hover:text-white transition-colors"
        >
            <X size={28} />
        </button>
    );
}

export default BackBtn;
