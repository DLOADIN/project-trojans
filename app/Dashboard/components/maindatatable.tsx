"use client"

import { useState } from "react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Play, Eye } from "lucide-react"

// Define the type for our accident data
type Accident = {
  id: string
  location: string
  timestamp: string
  severity: "low" | "medium" | "high"
  videoUrl: string
  thumbnailUrl: string
}

// Sample data
const accidents: Accident[] = [
  {
    id: "ACC-001",
    location: "Main St & 5th Ave",
    timestamp: "2023-05-12 14:32:45",
    severity: "high",
    videoUrl: "https://example.com/videos/acc001.mp4",
    thumbnailUrl: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "ACC-002",
    location: "Highway 101, Mile 45",
    timestamp: "2023-05-14 08:15:22",
    severity: "medium",
    videoUrl: "https://example.com/videos/acc002.mp4",
    thumbnailUrl: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "ACC-003",
    location: "Park Lane & Oak St",
    timestamp: "2023-05-15 17:45:10",
    severity: "low",
    videoUrl: "https://example.com/videos/acc003.mp4",
    thumbnailUrl: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "ACC-004",
    location: "Industrial Blvd, Warehouse 7",
    timestamp: "2023-05-16 11:22:33",
    severity: "high",
    videoUrl: "https://example.com/videos/acc004.mp4",
    thumbnailUrl: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "ACC-005",
    location: "Central Mall, Parking Lot B",
    timestamp: "2023-05-17 13:05:18",
    severity: "medium",
    videoUrl: "https://example.com/videos/acc005.mp4",
    thumbnailUrl: "/placeholder.svg?height=80&width=120",
  },
]

// Helper function to get badge color based on severity
const getSeverityBadge = (severity: Accident["severity"]) => {
  switch (severity) {
    case "low":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          Low
        </Badge>
      )
    case "medium":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Medium
        </Badge>
      )
    case "high":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          High
        </Badge>
      )
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

export default function AccidentTable() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Accident Reports</h1>

      <div className="rounded-md border">
        <Table>
          <TableCaption>A list of recent accident reports.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="text-right">Video Highlight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accidents.map((accident) => (
              <TableRow
                key={accident.id}
                className={
                  accident.severity === "high" ? "bg-red-50" : accident.severity === "medium" ? "bg-yellow-50" : ""
                }
              >
                <TableCell className="font-medium">{accident.id}</TableCell>
                <TableCell>{accident.location}</TableCell>
                <TableCell>{accident.timestamp}</TableCell>
                <TableCell>{getSeverityBadge(accident.severity)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <img
                      src={accident.thumbnailUrl || "/placeholder.svg"}
                      alt={`Thumbnail for ${accident.id}`}
                      className="w-20 h-12 object-cover rounded border"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-2">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>
                            Accident {accident.id} - {accident.location}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                          <div className="text-center">
                            <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">Video would play here</p>
                            <p className="text-xs text-muted-foreground">{accident.videoUrl}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p>
                            <strong>Location:</strong> {accident.location}
                          </p>
                          <p>
                            <strong>Time:</strong> {accident.timestamp}
                          </p>
                          <p>
                            <strong>Severity:</strong>{" "}
                            {accident.severity.charAt(0).toUpperCase() + accident.severity.slice(1)}
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

