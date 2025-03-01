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
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setUploading(true)

      const reader = new FileReader()
      reader.readAsArrayBuffer(selectedFile)
      reader.onload = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: reader.result,
          })

          if (!response.ok) {
            throw new Error('Upload failed')
          }

          const data = await response.text() // Handle plain text response
          setSelectedVideo(URL.createObjectURL(selectedFile))
          console.log('Upload successful:', data)
        } catch (error) {
          console.error('Error uploading file:', error)
        } finally {
          setUploading(false)
        }
      }
      reader.onerror = () => {
        console.error('Error reading file')
        setUploading(false)
      }
    }
  }

  const removeFile = () => {
    setFile(null)
    setProgress(0)
    setSelectedVideo(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>Upload your accident video footage here.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-4 text-gray-500" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">MP4, AVI, MOV (MAX. 800MB)</p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
        {file && (
          <div className="mt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={progress} className="mt-2" />
          </div>
        )}
        {selectedVideo && (
          <div className="mt-4">
            <video
              src={selectedVideo}
              controls
              className="w-full rounded-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}