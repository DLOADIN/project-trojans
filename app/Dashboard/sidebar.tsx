"use client"

import Link from "next/link"
import { Home, Upload, Bell, Film } from "lucide-react"

const menuItems = [
  { name: "Home", icon: Home, href: "/Dashboard" },
  { name: "Upload", icon: Upload, href: "/Dashboard/upload" },
  { name: "Notifications", icon: Bell, href: "/Dashboard/notifications" },
  { name: "Highlights", icon: Film, href: "/Dashboard/highlights" },  
]

export function Sidebar() {
  return (
    <div className="flex h-screen w-[240px] flex-col border-r border-[#f1f1f1] bg-white">
      <div className="flex h-[60px] items-center border-b border-[#f1f1f1] px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D959] rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-50px">A</span>
              </div>
              <span className="text-gray-900 text-lg font-medium">AccidentAI</span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[16px] text-[#6f767e] hover:bg-[text-green-700] space-y-10"
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}

