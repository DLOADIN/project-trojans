"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface AccidentData {
  id: number;
  timestamp: string;
  location: string;
  severity_level: string;
  severity_score: number;
  accuracy: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

  // Calculate severity_score by location
  const severityByLocation: { [key: string]: number } = {};
  databaseData.forEach(item => {
    if (!severityByLocation[item.location]) {
      severityByLocation[item.location] = 0;
    }
    severityByLocation[item.location] += item.severity_score;
  });

  // Calculate most frequent accident times
  const accidentTimes: { [key: string]: number } = {};
  databaseData.forEach(item => {
    const date = new Date(item.timestamp);
    const hour = date.getHours();
    const timeSlot = `${hour}:00 - ${hour + 1}:00`;

    if (!accidentTimes[timeSlot]) {
      accidentTimes[timeSlot] = 0;
    }
    accidentTimes[timeSlot] += 1;
  });

  // Calculate most frequent accident locations
  const accidentLocations: { [key: string]: number } = {};
  databaseData.forEach(item => {
    if (!accidentLocations[item.location]) {
      accidentLocations[item.location] = 0;
    }
    accidentLocations[item.location] += 1;
  });

  // Chart 1: Total average of accidents recorded (Bar Chart)
  const averageAccidentsChartData = {
    labels: ["Average Severity Score"],
    datasets: [
      {
        label: 'Average Severity Score',
        data: [averageSeverityScore],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }
    ]
  };

  // Chart 2: Severity score by location (Bar Chart)
  const severityByLocationChartData = {
    labels: Object.keys(severityByLocation),
    datasets: [
      {
        label: 'Severity Score by Location',
        data: Object.values(severityByLocation),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      }
    ]
  };

  // Chart 3: Most frequent accident times (Pie Chart)
  const accidentTimesChartData = {
    labels: Object.keys(accidentTimes),
    datasets: [
      {
        label: 'Accidents by Time',
        data: Object.values(accidentTimes),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }
    ]
  };

  // Chart 4: Most frequent accident locations (Pie Chart)
  const accidentLocationsChartData = {
    labels: Object.keys(accidentLocations),
    datasets: [
      {
        label: 'Accidents by Location',
        data: Object.values(accidentLocations),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }
    ]
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Total average of accidents recorded */}
            <div>
              <h3 className="text-lg font-medium mb-2">Average Severity Score</h3>
              <Bar data={averageAccidentsChartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Average Severity Score' } } }} />
            </div>

            {/* Chart 2: Severity score by location */}
            <div>
              <h3 className="text-lg font-medium mb-2">Severity Score by Location</h3>
              <Bar data={severityByLocationChartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Severity Score by Location' } } }} />
            </div>

            {/* Chart 3: Most frequent accident times */}
            <div>
              <h3 className="text-lg font-medium mb-2">Accidents by Time</h3>
              <Pie data={accidentTimesChartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Accidents by Time' } } }} />
            </div>

            {/* Chart 4: Most frequent accident locations */}
            <div>
              <h3 className="text-lg font-medium mb-2">Accidents by Location</h3>
              <Pie data={accidentLocationsChartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Accidents by Location' } } }} />
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