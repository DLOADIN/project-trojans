"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"

export function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setProgress(progress)
        if (progress >= 100) clearInterval(interval)
      }, 500)
    }
  }

  const removeFile = () => {
    setFile(null)
    setProgress(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>Upload your video for analysis. Supported formats: MP4, AVI, MOV</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex h-[200px] w-full items-center justify-center rounded-lg border-2 border-dashed border-green-700">
            {!file ? (
              <label className="flex cursor-pointer flex-col items-center space-y-2">
                <Upload className="h-10 w-10 text-green-700" />
                <span className="text-sm font-medium text-green-700">Drop your video here or click to browse</span>
                <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <span className="text-sm font-medium">{file.name}</span>
                {progress < 100 ? (
                  <div className="w-full max-w-xs">
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <span className="text-sm text-green-700">Upload complete!</span>
                )}
                <Button variant="outline" size="sm" className="mt-2" onClick={removeFile}>
                  <X className="mr-2 h-4 w-4" />
                  Remove file
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

