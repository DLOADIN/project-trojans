import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { AlertCircle, CheckCircle2, Upload, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface AccidentAnalysis {
  id: number;
  timestamp: string;
  location: string;
  severity_level: string;
  severity_score: number;
  video_path: string;
  accuracy: number;
  processed_frames?: number;
  total_frames?: number;
}

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AccidentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch latest accident data
  const fetchLatestAccidentData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("http://localhost:5000/fetch_database");
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Get the most recent accident data
        const latestAccident = data.data[0];
        setAnalysis(latestAccident);
      }
    } catch (err) {
      console.error("Error fetching accident data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch data on component mount and every 5 seconds
  useEffect(() => {
    fetchLatestAccidentData();
    const interval = setInterval(fetchLatestAccidentData, 5000);
    return () => clearInterval(interval);
  }, []);

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
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      // After upload, fetch the latest data
      await fetchLatestAccidentData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Upload Video for Analysis</CardTitle>
            <CardDescription>
              Upload a video file to detect accidents and analyze their severity
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLatestAccidentData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Upload
                  <Upload className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Processing</AlertTitle>
              <AlertDescription className="text-blue-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {analysis && (
            <div className="mt-6 border rounded-md p-4 bg-white shadow-sm">
              <h3 className="font-bold text-lg mb-3 flex items-center text-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Latest Analysis Results
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm font-medium text-gray-600">Timestamp:</div>
                  <div className="text-sm">{formatDate(analysis.timestamp)}</div>
                  
                  <div className="text-sm font-medium text-gray-600">Location:</div>
                  <div className="text-sm">{analysis.location || 'Unknown'}</div>
                  
                  <div className="text-sm font-medium text-gray-600">Severity:</div>
                  <div className="text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(analysis.severity_level)}`}>
                      {analysis.severity_level ? 
                        (analysis.severity_level.charAt(0).toUpperCase() + analysis.severity_level.slice(1)) :
                        'Unknown'}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-600">Severity Score:</div>
                  <div className="text-sm">{analysis.severity_score ? 
                    analysis.severity_score.toFixed(1) + '%' : 'N/A'}</div>
                  
                  <div className="text-sm font-medium text-gray-600">Accuracy:</div>
                  <div className="text-sm">{analysis.accuracy ? 
                    analysis.accuracy.toFixed(1) + '%' : 'N/A'}</div>

                  {analysis.processed_frames && analysis.total_frames && (
                    <>
                      <div className="text-sm font-medium text-gray-600">Processed Frames:</div>
                      <div className="text-sm">
                        {analysis.processed_frames} / {analysis.total_frames}
                      </div>
                    </>
                  )}
                </div>

                {analysis.video_path && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-gray-600 mb-2">Processed Video:</div>
                    <div className="text-sm text-gray-500 break-all">
                      {analysis.video_path}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}