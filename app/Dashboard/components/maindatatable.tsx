"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, ChevronLeft, ChevronRight, Calendar, FileText, FileSpreadsheet } from "lucide-react";
import { generateHeaderHTML } from "./logo-utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>("");
  const [exportEndDate, setExportEndDate] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<string>("csv");

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

  // Function to generate Excel (XLSX) content
  const generateExcelContent = (exportData: AccidentData[]) => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportPeriod = (exportStartDate ? exportStartDate : 'All Time') + ' to ' + (exportEndDate ? exportEndDate : 'Present');
    
    // Create HTML table that can be converted to Excel
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Accident Report</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          ${generateHeaderHTML('Accident Detection System Report', currentDate, reportPeriod)}
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Score</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
    `;

    exportData.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.id}</td>
          <td>${new Date(item.timestamp).toLocaleString()}</td>
          <td>${item.location}</td>
          <td>${item.severity_level}</td>
          <td>${item.severity_score.toFixed(2)}</td>
          <td>${item.accuracy.toFixed(2)}%</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          
          <div class="summary">
            <h3>Report Summary</h3>
            <p><strong>Total Records:</strong> ${exportData.length}</p>
            <p><strong>Average Severity Score:</strong> ${exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.severity_score, 0) / exportData.length).toFixed(2) : '0'}</p>
            <p><strong>Average Accuracy:</strong> ${exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.accuracy, 0) / exportData.length).toFixed(2) : '0'}%</p>
          </div>
        </body>
      </html>
    `;

    return htmlContent;
  };

  // Function to generate PDF content
  const generatePDFContent = (exportData: AccidentData[]) => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportPeriod = (exportStartDate ? exportStartDate : 'All Time') + ' to ' + (exportEndDate ? exportEndDate : 'Present');
    
    // Create HTML content optimized for PDF generation
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Accident Report</title>
          <style>
            @page { margin: 1in; }
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; page-break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10px; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .summary { margin-top: 30px; padding: 15px; background-color: #f9f9f9; page-break-inside: avoid; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          ${generateHeaderHTML('Accident Detection System Report', currentDate, reportPeriod)}
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Score</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
    `;

    exportData.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.id}</td>
          <td>${new Date(item.timestamp).toLocaleString()}</td>
          <td>${item.location}</td>
          <td>${item.severity_level}</td>
          <td>${item.severity_score.toFixed(2)}</td>
          <td>${item.accuracy.toFixed(2)}%</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          
          <div class="summary">
            <h3>Report Summary</h3>
            <p><strong>Total Records:</strong> ${exportData.length}</p>
            <p><strong>Average Severity Score:</strong> ${exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.severity_score, 0) / exportData.length).toFixed(2) : '0'}</p>
            <p><strong>Average Accuracy:</strong> ${exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.accuracy, 0) / exportData.length).toFixed(2) : '0'}%</p>
          </div>
        </body>
      </html>
    `;

    return htmlContent;
  };

  const generateReport = () => {
    // Filter data based on export date range
    let exportData = filteredData;
    if (exportStartDate || exportEndDate) {
      exportData = data.filter((item) => {
        const itemDate = new Date(item.timestamp);
        const start = exportStartDate ? new Date(exportStartDate) : null;
        const end = exportEndDate ? new Date(exportEndDate) : null;
        
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
    }

    if (exportFormat === "csv") {
      generateCSVReport(exportData);
    } else if (exportFormat === "excel") {
      generateExcelReport(exportData);
    } else if (exportFormat === "pdf") {
      generatePDFReport(exportData);
    }

    // Close dialog and reset export dates
    setExportDialogOpen(false);
    setExportStartDate("");
    setExportEndDate("");
  };

  const generateCSVReport = (exportData: AccidentData[]) => {
    // Create CSV content with header
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add document header with logo and release date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Logo representation in CSV (using ASCII art style)
    csvContent += escapeCSV("╔══════════════════════════════════════════════════════════════╗") + "\n";
    csvContent += escapeCSV("║                    ACCIDENTAI                              ║") + "\n";
    csvContent += escapeCSV("║              Accident Detection System                     ║") + "\n";
    csvContent += escapeCSV("║                    [A] Logo                                ║") + "\n";
    csvContent += escapeCSV("╚══════════════════════════════════════════════════════════════╝") + "\n";
    csvContent += "\n"; // Empty line for spacing
    
    csvContent += escapeCSV("Report Title: Accident Detection System Report") + "\n";
    csvContent += escapeCSV("Generated on: " + currentDate) + "\n";
    csvContent += escapeCSV("Document Release Date: " + currentDate) + "\n";
    csvContent += escapeCSV("Report Period: " + (exportStartDate ? exportStartDate : "All Time") + " to " + (exportEndDate ? exportEndDate : "Present")) + "\n";
    csvContent += "\n"; // Empty line for spacing
    
    // Add column headers
    csvContent += "ID,Time,Location,Severity,Score,Accuracy\n";
    
    // Export filtered data
    exportData.forEach(item => {
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
    
    // Add summary footer
    csvContent += "\n";
    csvContent += escapeCSV("Report Summary:") + "\n";
    csvContent += escapeCSV("Total Records: " + exportData.length) + "\n";
    csvContent += escapeCSV("Average Severity Score: " + (exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.severity_score, 0) / exportData.length).toFixed(2) : "0")) + "\n";
    csvContent += escapeCSV("Average Accuracy: " + (exportData.length > 0 ? (exportData.reduce((sum, item) => sum + item.accuracy, 0) / exportData.length).toFixed(2) : "0") + "%") + "\n";
    
    // Create download link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Create filename with date range
    let filename = "accident-report";
    if (exportStartDate && exportEndDate) {
      filename += `-${exportStartDate}-to-${exportEndDate}`;
    } else if (exportStartDate) {
      filename += `-from-${exportStartDate}`;
    } else if (exportEndDate) {
      filename += `-until-${exportEndDate}`;
    }
    filename += `-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcelReport = (exportData: AccidentData[]) => {
    const htmlContent = generateExcelContent(exportData);
    
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement("a");
    link.href = url;
    
    // Create filename with date range
    let filename = "accident-report";
    if (exportStartDate && exportEndDate) {
      filename += `-${exportStartDate}-to-${exportEndDate}`;
    } else if (exportStartDate) {
      filename += `-from-${exportStartDate}`;
    } else if (exportEndDate) {
      filename += `-until-${exportEndDate}`;
    }
    filename += `-${new Date().toISOString().split('T')[0]}.xls`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = (exportData: AccidentData[]) => {
    const htmlContent = generatePDFContent(exportData);
    
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    
    // Open in new window for PDF printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    window.URL.revokeObjectURL(url);
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
          <div className="flex flex-col">
            <label htmlFor="end-date" className="text-xs text-gray-500 mb-1">End Date</label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
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
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading || filteredData.length === 0} className="h-9">
                  <Download className="h-4 w-4" />
                  <span className="ml-2">Export</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Export Accident Report</DialogTitle>
                  <DialogDescription>
                    Select the format and date range for the report export. Leave dates empty to export all data.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="export-format" className="text-right">
                      Format
                    </label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            CSV
                          </div>
                        </SelectItem>
                        <SelectItem value="excel">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel (.xls)
                          </div>
                        </SelectItem>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            PDF (Print)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="export-start-date" className="text-right">
                      Start Date
                    </label>
                    <Input
                      id="export-start-date"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="export-end-date" className="text-right">
                      End Date
                    </label>
                    <Input
                      id="export-end-date"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={generateReport}>
                    Export Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
