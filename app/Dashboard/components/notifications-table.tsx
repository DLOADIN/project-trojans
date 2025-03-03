"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import axios from "axios"
import { Line } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement)

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
  const [datasetsVisibility, setDatasetsVisibility] = useState({ severity: true, accuracy: true })

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
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  const toggleDatasetVisibility = (dataset: 'severity' | 'accuracy') => {
    setDatasetsVisibility(prev => ({ ...prev, [dataset]: !prev[dataset] }))
  }

  const chartData = {
    labels: databaseData.map(data => data.time.toLocaleString()),
    datasets: [
      {
        label: 'Severity Score',
        data: databaseData.map(data => data.severity_score),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: datasetsVisibility.severity ? 2 : 0,
        hidden: !datasetsVisibility.severity,
      },
      {
        label: 'Accuracy',
        data: databaseData.map(data => data.accuracy),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: datasetsVisibility.accuracy ? 2 : 0,
        hidden: !datasetsVisibility.accuracy,
      }
    ]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accident Data</CardTitle>
        <CardDescription>Details of recorded accidents</CardDescription>
      </CardHeader>
      <CardContent>
        {databaseData.length > 0 ? (
          <>
            <div className="mb-4">
              <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Accident Data' } } }} />
            </div>
            <div className="flex space-x-4">
              <button onClick={() => toggleDatasetVisibility('severity')} className="px-4 py-2 bg-blue-500 text-white rounded">
                Toggle Severity Score
              </button>
              <button onClick={() => toggleDatasetVisibility('accuracy')} className="px-4 py-2 bg-purple-500 text-white rounded">
                Toggle Accuracy
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">Loading data...</div>
        )}
      </CardContent>
    </Card>
  )
}

export default AccidentDataChart