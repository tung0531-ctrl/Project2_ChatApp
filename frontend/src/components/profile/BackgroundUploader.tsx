import { useUserStore } from "@/stores/useUserStore";
import { useRef } from "react";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

const BackgroundUploader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateBackgroundUrl, loading } = useUserStore();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    await updateBackgroundUrl(formData);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        disabled={loading}
        onClick={handleClick}
        className="absolute right-3 top-3 z-20 size-8 rounded-full border border-white/30 bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-black/60"
      >
        <Plus className="size-4" />
      </Button>

      <input
        type="file"
        accept="image/*"
        hidden
        ref={fileInputRef}
        onChange={handleUpload}
      />
    </>
  );
};

export default BackgroundUploader;