"use clien"

import { NotificationsTable } from "../components/notifications-table"

export default function NotificationsPage() {
  return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <NotificationsTable />
      </div>
  )
}

