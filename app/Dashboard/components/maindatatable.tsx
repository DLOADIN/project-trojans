"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import axios from "axios"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

interface AccidentData {
  id: number
  time: Date
  location: string
  severity_level: string
  severity_score: number
  accuracy: number
}

function MainDataTable() {
  const [databaseData, setDatabaseData] = useState<AccidentData[]>([])
  const [searchId, setSearchId] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [searchDate, setSearchDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await axios.get("http://127.0.0.1:5000/fetch_database")
      
      // If the response is empty array or not an array, handle it gracefully
      if (!Array.isArray(response.data) || response.data.length === 0) {
        setDatabaseData([])
        setIsLoading(false)
        return
      }
      
      const formattedData = response.data.map((i: any) => ({
        id: i[0],
        time: new Date(i[1]),
        location: i[2],
        severity_level: i[3],
        severity_score: i[4],
        accuracy: i[5]
      }))
      
      setDatabaseData(formattedData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load accident data. Please check if the server is running.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Listen for refresh events from the video upload component
    const handleRefresh = () => {
      fetchData()
    }
    
    window.addEventListener('refreshDataTable', handleRefresh)
    
    return () => {
      window.removeEventListener('refreshDataTable', handleRefresh)
    }
  }, [])

  const handleRefreshClick = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const filteredData = databaseData.filter((data) => {
    const matchesId = data.id.toString().includes(searchId)
    const matchesLocation = data.location.toLowerCase().includes(searchLocation.toLowerCase())
    const matchesDate = searchDate ? data.time.toDateString() === searchDate.toDateString() : true
    return matchesId && matchesLocation && matchesDate
  })

  // Chart data calculations (only if we have data)
  const severityData = databaseData.length > 0 
    ? databaseData.reduce((acc, data) => {
        acc[data.severity_level] = (acc[data.severity_level] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    : {}

  const severityChartData = {
    labels: Object.keys(severityData),
    datasets: [
      {
        label: "Severity Level",
        data: Object.values(severityData),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"], // Colors for low, medium, high
      },
    ],
  }

  // Other chart data calculations...

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Accident Data</CardTitle>
          <CardDescription>Details of recorded accidents</CardDescription>
        </div>
        <Button 
          onClick={handleRefreshClick}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
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

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-gray-600">Loading accident data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 bg-red-50 rounded-md">
            <AlertCircle className="text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        ) : databaseData.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="text-gray-600">No accident data available.</p>
            <p className="text-gray-500 text-sm mt-2">Upload and analyze a video to see results here.</p>
          </div>
        ) : (
          <>
            {/* Charts Section (only render if we have data) */}
            {databaseData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Chart components go here */}
                {/* ... */}
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Level</th>
                    <th className="sticky top-0 bg-white px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Score</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.accuracy}</td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No data matching your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default MainDataTable