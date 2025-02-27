"use client"

import { Bell } from "lucide-react"

const date = new Date();
const TodayDate = date.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });

export function UserNav() {
  return (
    <div className="flex items-center gap-4">
      <button className="relative rounded-full p-2 hover:bg-[#f8f9fa]">
      </button>
      <span className="text-sm text-[#1a1d1f]">{TodayDate}</span>
    </div>
  )
}

