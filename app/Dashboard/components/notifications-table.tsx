"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AccidentData {
  id: number
  time: Date
  location: string
  severity_level: string
  severity_score: number
  accuracy: number
}

// Type for raw data from API
type ApiResponseData = any[][]

function AccidentDataChart() {
  const [databaseData, setDatabaseData] = useState<AccidentData[]>([])
  const [severityScorePerMonth, setSeverityScorePerMonth] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<ApiResponseData>("http://127.0.0.1:5000/fetch_database");
        
        // Now TypeScript knows that response.data is ApiResponseData
        const formattedData: AccidentData[] = response.data.map((item: any[]) => ({
          id: Number(item[0]),
          time: new Date(item[1]),
          location: String(item[2]),
          severity_level: String(item[3]),
          severity_score: Number(item[4]),
          accuracy: Number(item[5])
        }));
        
        setDatabaseData(formattedData);

        interface SeverityScorePerMonth {
          [key: string]: number;
        }

        const severityScorePerMonth = formattedData.reduce((acc:SeverityScorePerMonth, data) => {
          const month = data.time.toLocaleString('default', { month: 'long' });
          if (!acc[month]) {
            acc[month] = 0;
          }
          acc[month] += data.severity_score;
          return acc;
        }, {});

        setSeverityScorePerMonth(severityScorePerMonth);
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

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
        {databaseData.length > 0 ? (
          <div>
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Severity Score per Month' } } }} />
          </div>
        ) : (
          <div className="text-center py-8">Loading data...</div>
        )}
      </CardContent>
    </Card>
  )
}

export default AccidentDataChart