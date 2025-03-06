import React, { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import VideoPlayer from '../ui/videoplayer';
import { Card, CardContent } from '../ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

interface UploadStatus {
  message: string;
  isError: boolean;
}

interface ProcessingStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  message: string;
}

interface VideoUploadProps {
  onUploadSuccess: (videoUrl: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({ status: 'idle', message: '' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > 800 * 1024 * 1024) {
        setUploadStatus({ message: 'File is too large. Maximum size is 800MB.', isError: true });
        return;
      }

      setFile(selectedFile);
      setUploadStatus(null);
      setProcessingStatus({ status: 'idle', message: '' });
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (res.ok) {
        const response = await res.json();
        const uploadedVideoUrl = response.videoUrl;
        setUploadStatus({ message: 'Upload successful. Processing video...', isError: false });
        setProgress(100);
        setVideoUrl(`${API_URL}/get_video/${uploadedVideoUrl}`);

        setProcessingStatus({
          status: 'processing',
          message: 'Your video is being analyzed. This may take a few moments...',
        });

        onUploadSuccess(uploadedVideoUrl);
        checkProcessingStatus(uploadedVideoUrl);
      } else {
        setUploadStatus({ message: `Upload failed: ${res.statusText}`, isError: true });
        setProgress(0);
        setProcessingStatus({ status: 'error', message: 'Failed to process video. Please try again.' });
      }
    } catch (error) {
      setUploadStatus({ message: 'Upload failed. Please try again.', isError: true });
      setProgress(0);
      setProcessingStatus({ status: 'error', message: 'Failed to upload video. Please check your connection.' });
    } finally {
      setUploading(false);
    }
  };

  const checkProcessingStatus = async (filename: string) => {
    let retries = 0;
    const maxRetries = 30; // Check for up to 2.5 minutes

    setProcessingStatus({ status: 'processing', message: 'Analyzing video for accident detection...' });

    const interval = setInterval(async () => {
      if (retries >= maxRetries) {
        clearInterval(interval);
        setProcessingStatus({ status: 'error', message: 'Processing timed out. The video may still be analyzed in the background.' });
        return;
      }
      retries++;

      try {
        const res = await fetch(`${API_URL}/processing_status/${filename}`);
        const data = await res.json();

        if (data.processed) {
          clearInterval(interval);
          setProcessingStatus({ status: 'completed', message: 'Analysis complete! Check the data table for results.' });

          window.dispatchEvent(new CustomEvent('refreshDataTable'));

          setVideoUrl(`${API_URL}/get_video/${filename}`);
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
      }
    }, 5000);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col space-y-4">
          <input id="video-upload" type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          {file && <p className="text-gray-600">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>}
          {progress > 0 && <Progress value={progress} className="h-2" />}

          {file && (
            <Button onClick={uploadFile} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? 'Uploading...' : 'Upload & Analyze'}
            </Button>
          )}

          {processingStatus.status === 'processing' && <p className="text-blue-600">{processingStatus.message}</p>}
          {processingStatus.status === 'completed' && <p className="text-green-600">{processingStatus.message}</p>}
          {processingStatus.status === 'error' && <p className="text-red-600">{processingStatus.message}</p>}

          {videoUrl && <VideoPlayer videoUrl={videoUrl} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUpload;
