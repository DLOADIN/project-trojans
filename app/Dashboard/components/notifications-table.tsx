"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import axios from "axios";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Pie,
  PieChart,
  Cell
} from "recharts";

interface AccidentData {
  id: number;
  timestamp: string;
  location: string;
  severity_level: string;
  severity_score: number;
  accuracy: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Color palette for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B8B',
  '#54C8FF', '#2DD4BF', '#FCD34D', '#FB923C', '#C084FC', '#F87171'
];

function AccidentDataChart() {
  const [databaseData, setDatabaseData] = useState<AccidentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<{ data: AccidentData[] }>(`${API_URL}/fetch_database`);
        setDatabaseData(response.data.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate total average of accidents recorded
  const totalAccidents = databaseData.length;
  const averageSeverityScore = totalAccidents > 0
    ? databaseData.reduce((sum, item) => sum + item.severity_score, 0) / totalAccidents
    : 0;

  // Chart 1: Total average of accidents recorded (Bar Chart)
  const averageAccidentsChartData = [
    {
      name: "Average Severity Score",
      value: parseFloat(averageSeverityScore.toFixed(2))
    }
  ];

  // Calculate severity_score by location
  const severityByLocationData = Object.entries(
    databaseData.reduce((acc, item) => {
      acc[item.location] = (acc[item.location] || 0) + item.severity_score;
      return acc;
    }, {} as Record<string, number>)
  ).map(([location, score]) => ({
    name: location,
    value: parseFloat(score.toFixed(2))
  }));

  // Calculate most frequent accident times
  const accidentTimesData = Object.entries(
    databaseData.reduce((acc, item) => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      const timeSlot = `${hour}:00 - ${hour + 1}:00`;
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([timeSlot, count]) => ({
    name: timeSlot,
    value: count
  }));

  // Calculate most frequent accident locations
  const accidentLocationsData = Object.entries(
    databaseData.reduce((acc, item) => {
      acc[item.location] = (acc[item.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([location, count]) => ({
    name: location,
    value: count
  }));

  // Custom tooltip formatter
  const tooltipFormatter = (value: number) => [`${value}`, "Value"];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accident Data</CardTitle>
        <CardDescription>Details of recorded accidents</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading data...</div>
        ) : databaseData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart 1: Average Severity Score */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Average Severity Score</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={averageAccidentsChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={tooltipFormatter} />
                  <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Severity Score by Location */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Severity Score by Location</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityByLocationData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={tooltipFormatter} />
                  <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Accidents by Time */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Accidents by Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={accidentTimesData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {accidentTimesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={tooltipFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 4: Accidents by Location */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Accidents by Location</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={accidentLocationsData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {accidentLocationsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={tooltipFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

export default AccidentDataChart;