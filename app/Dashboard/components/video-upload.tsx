import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface AccidentAnalysis {
  id: number;
  timestamp: string;
  location: string;
  severity_level: string;
  severity_score: number;
  video_path: string;
  accuracy: number;
}

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AccidentAnalysis | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setUploadedVideo(data.videoUrl);
      
      // Start polling for status
      pollProcessingStatus(data.videoUrl);
    } catch (err) {
      console.error(err);
      setError("Failed to upload video");
      setUploading(false);
    }
  };

  const pollProcessingStatus = async (filename: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/processing_status/${filename}`);
        const data = await response.json();

        if (data.status === "completed") {
          setProgress(100);
          setUploading(false);
          // Fetch analysis results after processing is complete
          fetchAnalysisResults(filename);
          return true;
        } else if (data.status === "error") {
          setError("Error processing video");
          setUploading(false);
          return true;
        } else {
          setProgress(data.progress || 0);
          return false;
        }
      } catch (err) {
        console.error(err);
        setError("Failed to check processing status");
        setUploading(false);
        return true;
      }
    };

    const poll = async () => {
      const done = await checkStatus();
      if (!done) {
        setTimeout(poll, 1000);
      }
    };

    poll();
  };

  const fetchAnalysisResults = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:5000/get_video_analysis/${filename}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch analysis results");
      }
      
      const data = await response.json();
      if (data.status === "success") {
        setAnalysis(data.data);
      } else {
        console.warn("No analysis data found for this video");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analysis results");
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'fatal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date string properly
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Video for Analysis</CardTitle>
        <CardDescription>
          Upload a video file to detect accidents and analyze their severity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-green-700 hover:file:bg-violet-100"
              disabled={uploading}
            />
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
              {!uploading && <Upload className="ml-2 h-4 w-4" />}
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500">
                {progress < 100
                  ? `Processing video: ${progress}%`
                  : "Processing complete!"}
              </p>
            </div>
          )}

          {/* {uploadedVideo && !uploading && (
            <div className="mt-4">
              <video
                src={`http://localhost:5000/get_video/${uploadedVideo}`}
                controls
                className="w-full max-h-72 rounded-md"
              />
            </div>
          )} */}

          {analysis && (
            <div className="mt-6 border rounded-md p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Analysis Results
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Timestamp:</div>
                  <div className="text-sm">{formatDate(analysis.timestamp)}</div>
                  
                  <div className="text-sm font-medium">Location:</div>
                  <div className="text-sm">{analysis.location || 'Unknown'}</div>
                  
                  <div className="text-sm font-medium">Severity:</div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(analysis.severity_level)}`}>
                      {analysis.severity_level ? 
                        (analysis.severity_level.charAt(0).toUpperCase() + analysis.severity_level.slice(1)) :
                        'Unknown'}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium">Severity Score:</div>
                  <div className="text-sm">{analysis.severity_score ? 
                    analysis.severity_score.toFixed(1) + '%' : 'N/A'}</div>
                  
                  <div className="text-sm font-medium">Detection Accuracy:</div>
                  <div className="text-sm">{analysis.accuracy ? 
                    analysis.accuracy.toFixed(1) + '%' : 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}