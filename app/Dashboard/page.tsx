"use client"

import { OverviewSection } from "./components/overview-section"
import { TrendCharts } from "./components/trend-charts"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#1a1d1f]">Dashboard</h2>
      <OverviewSection />
      <TrendCharts />
    </div>
    
  )
}

