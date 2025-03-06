import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="video-player">
      <video
        src={videoUrl}
        controls
        autoPlay
        loop
        muted
        playsInline
        className="video-player__video"
      />
    </div>
  );
};

export default VideoPlayer;