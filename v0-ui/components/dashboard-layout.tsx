"use client"

import type React from "react"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} />
      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
