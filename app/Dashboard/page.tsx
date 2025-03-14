import AccidentTable from "./components/maindatatable"
import type { Metadata } from "next";

export const metadata: Metadata = {
   title: "ACCIDENTAI",
   description: "Created by Uteramahoro Avellin Bonaparte & Manzi David",
 };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#1a1d1f]">Dashboard</h2>
      <AccidentTable />
        {/* <OverviewSection />
        <TrendCharts /> */}
      </div>
    
  )
}

