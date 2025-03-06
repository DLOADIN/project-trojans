"use client"

import VideoUpload from "../components/video-upload"
import { useState } from "react";
import VideoPlayer from "../ui/videoplayer";

export default function UploadPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleUploadSuccess = (url: string) => {
    setVideoUrl(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Upload Video</h2>
      <VideoUpload onUploadSuccess={handleUploadSuccess} />
      {videoUrl && <VideoPlayer videoUrl={videoUrl} />}
    </div>
  );
}

