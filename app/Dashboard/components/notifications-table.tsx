"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  const [severityScorePerMonth, setSeverityScorePerMonth] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<{data: AccidentData[]}>(`${API_URL}/fetch_database`);
        setDatabaseData(response.data.data);
        
        // Calculate severity score per month
        const scoreByMonth: {[key: string]: number} = {};
        
        response.data.data.forEach(item => {
          const date = new Date(item.timestamp);
          const month = date.toLocaleString('default', { month: 'long' });
          
          if (!scoreByMonth[month]) {
            scoreByMonth[month] = 0;
          }
          scoreByMonth[month] += item.severity_score;
        });
        
        setSeverityScorePerMonth(scoreByMonth);
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

  const chartData = {
    labels: Object.keys(severityScorePerMonth),
    datasets: [
      {
        label: 'Severity Score per Month',
        data: Object.values(severityScorePerMonth),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
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
          <div>
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Severity Score per Month' } } }} />
          </div>
        ) : (
          <div className="text-center py-8">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

export default AccidentDataChart;