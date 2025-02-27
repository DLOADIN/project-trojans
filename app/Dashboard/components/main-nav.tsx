"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { Home, Upload, Bell, Film } from "lucide-react"

const menuItems = [
  {
    title: "Home",
    icon: Home,
    href: "/",
  },
  {
    title: "Upload",
    icon: Upload,
    href: "/upload",
  },
  {
    title: "Notifications",
    icon: Bell,
    href: "/notifications",
  },
  {
    title: "Highlights",
    icon: Film,
    href: "/highlights",
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[240px] flex-col border-r bg-muted/10">
      <div className="flex h-14 lg:h-[60px] items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10">
            <div className="h-full w-full rounded-lg bg-green-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AccidentAI-web</span>
            <span className="text-xs text-muted-foreground">Web app</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn("w-full justify-start gap-2 text-sm font-normal", pathname === item.href && "bg-accent")}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Riley Carter</span>
            <span className="text-xs text-muted-foreground">riley@email.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}

