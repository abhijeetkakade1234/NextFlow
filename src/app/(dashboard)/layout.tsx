// src/app/(dashboard)/layout.tsx
import { LeftSidebar } from '@/components/sidebar/LeftSidebar'
import { RightSidebar } from '@/components/sidebar/RightSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
        <RightSidebar />
      </div>
    </div>
  )
}
