"use client"

import { useState, useEffect } from "react"
import { Eye, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import axios from "axios"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

interface AccidentData {
  id: number
  time: Date
  location: string
  severity_level: string
  severity_score: number
  // video_path: string
  accuracy: number
}

function MainDataTable() {
  const [databaseData, setDatabaseData] = useState<AccidentData[]>([])
  const [searchId, setSearchId] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [searchDate, setSearchDate] = useState<Date | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [videoPath, setVideoPath] = useState("")
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/fetch_database")
        const formattedData = response.data.map((i: any) => ({
          id: i[0],
          time: new Date(i[1]),
          location: i[2],
          severity_level: i[3],
          severity_score: i[4],
          // video_path: i[5],
          accuracy: i[6]
        }))
        setDatabaseData(formattedData)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  const filteredData = databaseData.filter((data) => {
    const matchesId = data.id.toString().includes(searchId)
    const matchesLocation = data.location.toLowerCase().includes(searchLocation.toLowerCase())
    const matchesDate = searchDate ? data.time.toDateString() === searchDate.toDateString() : true
    return matchesId && matchesLocation && matchesDate
  })

  const handleEyeClick = (videoFilename: string) => {
    try {
      setVideoLoading(true)
      setVideoError("")
      
      // Properly encode the filename to handle spaces and special characters
      const encodedFilename = encodeURIComponent(videoFilename)
      const videoUrl = `http://127.0.0.1:5000/videos/${encodedFilename}`
      
      console.log("Loading video from:", videoUrl)
      setVideoPath(videoUrl)
      setShowVideo(true)
    } catch (error) {
      console.error("Error preparing video:", error)
      setVideoError("Failed to prepare video for playback")
    } finally {
      setVideoLoading(false)
    }
  }

  const handleCloseVideo = () => {
    setShowVideo(false)
    setVideoPath("")
    setVideoError("")
  }

  const handleVideoError = () => {
    setVideoError("Failed to load video. Please check if the file exists and is accessible.")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accident Data</CardTitle>
        <CardDescription>Details of recorded accidents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <DatePicker
            selected={searchDate}
            onChange={(date: Date | null) => setSearchDate(date)}
            showTimeSelect
            dateFormat="Pp"
            placeholderText="Search by Date and Time"
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="Search by Location"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Level</th>
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Score</th>
                {/* <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th> */}
                <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((data) => (
                <tr key={data.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.time.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.severity_level}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.severity_score}</td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Eye 
                      className="h-5 w-5 text-green-700 cursor-pointer hover:text-green-900" 
                      onClick={() => handleEyeClick(data.video_path)} 
                    />
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.accuracy}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No data matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Video Modal */}
        {showVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-medium">Video Playback</h3>
                <button 
                  onClick={handleCloseVideo}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 flex-grow overflow-auto">
                {videoLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : videoError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                    {videoError}
                  </div>
                ) : (
                  <div className="bg-black rounded-md overflow-hidden">
                    <video 
                      className="w-full max-h-[70vh]" 
                      controls 
                      autoPlay
                      onError={handleVideoError}
                    >
                      <source src={videoPath} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MainDataTable