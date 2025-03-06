"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface AccidentData {
  id: number;
  time: Date;
  location: string;
  severity_level: string;
  severity_score: number;
  accuracy: number;
}

interface ApiResponse {
  data: AccidentData[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

function MainDataTable() {
  const [databaseData, setDatabaseData] = useState<AccidentData[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchDate, setSearchDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/fetch_database`);

      if (!Array.isArray(response.data.data) || response.data.data.length === 0) {
        setDatabaseData([]);
        setIsLoading(false);
        return;
      }

      const formattedData = response.data.data.map((item) => ({
        id: item.id,
        time: new Date(item.time),
        location: item.location,
        severity_level: item.severity_level,
        severity_score: item.severity_score,
        accuracy: item.accuracy,
      }));

      setDatabaseData(formattedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load accident data. Please check if the server is running.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for refresh events from the video upload component
    const handleRefresh = () => fetchData();
    window.addEventListener("refreshDataTable", handleRefresh);

    return () => window.removeEventListener("refreshDataTable", handleRefresh);
  }, []);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const filteredData = databaseData.filter((data) => {
    const matchesId = searchId ? data.id.toString().includes(searchId) : true;
    const matchesLocation = searchLocation ? data.location.toLowerCase().includes(searchLocation.toLowerCase()) : true;
    const matchesDate = searchDate ? data.time.toDateString() === searchDate.toDateString() : true;
    return matchesId && matchesLocation && matchesDate;
  });

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
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
            onChange={(date) => setSearchDate(date)}
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
          <p className="text-center text-gray-600">Loading accident data...</p>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : databaseData.length === 0 ? (
          <p className="text-center text-gray-600">No accident data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
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
        )}
      </CardContent>
    </Card>
  );
}

export default MainDataTable;
