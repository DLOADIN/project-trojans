import React, { useState, useEffect } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  isProcessing?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, isProcessing = false }) => {
  const [isStreaming, setIsStreaming] = useState(isProcessing);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  const streamUrl = `${API_URL}/video_stream/${videoUrl.split('/').pop()}`;
  const regularVideoUrl = videoUrl;
  
  useEffect(() => {
    setIsStreaming(isProcessing);
  }, [isProcessing]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {isStreaming ? (
        // Streaming view (displays constantly updating JPEG frames)
        <img 
          src={streamUrl} 
          className="w-full h-full object-contain"
          alt="Live video stream" 
        />
      ) : (
        // Regular video player for completed videos
        <video 
          src={regularVideoUrl}
          className="w-full h-full"
          controls
          autoPlay
          muted
        />
      )}
    </div>
  );
};

export default VideoPlayer;