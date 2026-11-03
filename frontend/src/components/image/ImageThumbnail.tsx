import { useEffect, useState } from "react";

export function ImageThumbnail({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return (
    <img
      src={url}
      alt="Converted preview"
      className="h-12 w-12 shrink-0 rounded-md border border-border object-contain"
    />
  );
}
