"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import axios from "axios";
import { Input } from "../ui/input";
import { 
  Select, 
  SelectValue, 
  SelectTrigger, 
  SelectContent, 
  SelectItem
} from "../ui/select";

interface AccidentData {
  id: number;
  timestamp: string;
  location: string;
  severity_level: string;
  severity_score: number;
  accuracy: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ITEMS_PER_PAGE = 10;

export default function MainDataTable() {
  const [data, setData] = useState<AccidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get<{ data: AccidentData[] }>(`${API_URL}/fetch_database`);
      setData(response.data.data);
      setError(null);
      // Reset to first page when data is refreshed
      setCurrentPage(1);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, severityFilter]);

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Add a day to end date to include the entire end date (up to 23:59:59)
    if (end) {
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(end.getMilliseconds() - 1);
    }

    return (
      (!start || itemDate >= start) &&
      (!end || itemDate <= end) &&
      (severityFilter === "all" || item.severity_level === severityFilter)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Function to properly escape CSV values
  const escapeCSV = (value: string) => {
    // If value contains comma, quote, or newline, wrap in quotes and escape any quotes
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const generateReport = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Time,Location,Severity,Score,Accuracy\n";
    
    // Export all filtered data, not just current page
    filteredData.forEach(item => {
      // Format the date and properly escape all values
      const formattedDate = escapeCSV(new Date(item.timestamp).toLocaleString());
      const formattedLocation = escapeCSV(item.location);
      const formattedSeverity = escapeCSV(item.severity_level);
      
      const row = [
        item.id,
        formattedDate,
        formattedLocation,
        formattedSeverity,
        item.severity_score.toFixed(2),
        item.accuracy.toFixed(2) + "%"
      ].join(",");
      
      csvContent += row + "\n";
    });
    
    // Create download link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `accident-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSeverityFilter("all");
    setCurrentPage(1);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Accident Records</CardTitle>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label htmlFor="start-date" className="text-xs text-gray-500 mb-1">Select Day</label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          {/* <div className="flex flex-col">
            <label htmlFor="end-date" className="text-xs text-gray-500 mb-1">End Date</label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div> */}
          <div className="flex flex-col">
            <label htmlFor="severity-filter" className="text-xs text-gray-500 mb-1">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger id="severity-filter" className="w-[180px] h-9 rounded-lg bg-white">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="fatal">Fatal</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={clearFilters} variant="outline" size="sm" className="h-9">
              Clear Filters
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading} className="h-9">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-2">Refresh</span>
            </Button>
            <Button onClick={generateReport} variant="outline" size="sm" disabled={loading || filteredData.length === 0} className="h-9">
              <Download className="h-4 w-4" />
              <span className="ml-2">Export CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading data...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No accident data available for the selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPageData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.severity_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.severity_score.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.accuracy.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {filteredData.length > 0 && (
        <CardFooter className="flex justify-between items-center px-6 py-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage} 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-1">Previous</span>
            </Button>
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <span className="mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}