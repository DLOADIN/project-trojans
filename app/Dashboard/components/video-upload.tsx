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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: 'idle',
    message: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > 800 * 1024 * 1024) {
        setUploadStatus({ message: 'File is too large. Maximum size is 800MB.', isError: true });
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // Generate preview
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
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (res.ok) {
        const response = await res.json();
        const videoUrl = response.videoUrl;
        setUploadStatus({ message: 'Upload successful. Processing video...', isError: false });
        setProgress(100);
        setVideoUrl(`${API_URL}/videos/${videoUrl}`); // Update with actual URL pattern
        
        setProcessingStatus({
          status: 'processing',
          message: 'Your video is being analyzed. This may take a few moments...'
        });
        
        onUploadSuccess(videoUrl);
        checkProcessingStatus(videoUrl);
      } else {
        setUploadStatus({ message: `Upload failed: ${res.statusText}`, isError: true });
        setProgress(0);
        setProcessingStatus({
          status: 'error',
          message: 'Failed to process video. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus({ message: 'Upload failed. Please try again.', isError: true });
      setProgress(0);
      setProcessingStatus({
        status: 'error',
        message: 'Failed to upload video. Please check your connection and try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const checkProcessingStatus = async (filename: string) => {
    let retries = 0;
    const maxRetries = 30; // Check for up to 2.5 minutes (30 * 5 seconds)
    
    setProcessingStatus({
      status: 'processing',
      message: 'Analyzing video for accident detection...'
    });
    
    const interval = setInterval(async () => {
      if (retries >= maxRetries) {
        clearInterval(interval);
        setProcessingStatus({
          status: 'error',
          message: 'Processing timed out. The video may still be analyzed in the background.'
        });
        return;
      }
      retries++;
      
      try {
        const res = await fetch(`${API_URL}/processing_status/${filename}`);
        const data = await res.json();
        
        if (data.processed) {
          clearInterval(interval);
          setProcessingStatus({
            status: 'completed',
            message: 'Analysis complete! Check the data table for results.'
          });
          
          // Refresh data in the main data table
          window.dispatchEvent(new CustomEvent('refreshDataTable'));
        } else {
          // Update processing message with more details
          const statusMessages = [
            'Detecting potential accidents...',
            'Analyzing severity levels...',
            'Calculating accident probabilities...',
            'Evaluating detection accuracy...',
            'Almost finished processing...'
          ];
          
          const messageIndex = Math.min(Math.floor(retries / 3), statusMessages.length - 1);
          
          setProcessingStatus({
            status: 'processing',
            message: statusMessages[messageIndex]
          });
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // Save interval ID for cleanup
    return () => clearInterval(interval);
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setUploadStatus(null);
    setProcessingStatus({ status: 'idle', message: '' });
  };

  // Render processing status indicator
  const renderProcessingStatus = () => {
    switch (processingStatus.status) {
      case 'processing':
        return (
          <div className="flex items-center space-x-2 mt-4 p-4 bg-blue-50 rounded-md">
            <Loader className="animate-spin text-blue-500" size={20} />
            <p className="text-blue-700">{processingStatus.message}</p>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center space-x-2 mt-4 p-4 bg-green-50 rounded-md">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-700">{processingStatus.message}</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 mt-4 p-4 bg-red-50 rounded-md">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700">{processingStatus.message}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col space-y-4">
          <label 
            htmlFor="video-upload" 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col items-center space-y-2">
              <Upload className="text-gray-400 mb-2" size={30} />
              <p className="text-gray-600 font-medium">Drop your video here or click to browse</p>
              <p className="text-sm text-gray-400">MP4, MOV, AVI up to 800MB</p>
            </div>
            <input 
              id="video-upload" 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>
          
          {file && (
            <div className="mt-4 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-gray-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</div>
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X size={18} />
                </Button>
              </div>
              
              {progress > 0 && progress < 100 && (
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">Uploading: {progress}%</p>
                </div>
              )}
            </div>
          )}
          
          {previewUrl && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <VideoPlayer videoUrl={previewUrl} />
            </div>
          )}
          
          {file && (
            <div className="flex space-x-2 mt-4">
              <Button 
                onClick={uploadFile} 
                disabled={uploading} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
            </div>
          )}
          
          {renderProcessingStatus()}
          
          {uploadStatus && uploadStatus.isError && (
            <div className="flex items-center space-x-2 mt-4 p-4 bg-red-50 rounded-md">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-red-700">{uploadStatus.message}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUpload;