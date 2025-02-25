"use client"

import { Globe } from "@/components/ui/globe"

export function RoadSafetySection() {
  return (
    <section className="container mx-auto py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Revolutionizing Road Safety
          </h2>
          <p className="text-lg mb-4 text-gray-700">
            Our advanced scanning system is transforming how we approach road safety across the globe. By utilizing
            cutting-edge sensors and AI technology, we're creating a network of intelligent monitoring systems that can
            detect potential hazards before they become accidents.
          </p>
          <p className="text-lg mb-4 text-gray-700">The system provides real-time alerts to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
            <li>Drivers about upcoming road conditions and potential hazards</li>
            <li>Pedestrians through mobile notifications in high-risk areas</li>
            <li>Emergency services with precise location data for faster response</li>
            <li>Traffic management systems to optimize flow and reduce congestion</li>
          </ul>
          <p className="text-lg font-medium text-gray-800">
            With implementation in major cities worldwide, we're building a safer future for everyone on the road.
          </p>
        </div>
        <div className="relative order-1 md:order-2 h-[500px]">
          <div className="relative flex size-full max-w-lg mx-auto items-center justify-center overflow-hidden rounded-lg border bg-background px-8 pb-40 pt-8 md:pb-60 md:shadow-xl">
            <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-6xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
              Global Safety
            </span>
            <Globe className="top-28" />
            <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
          </div>
        </div>
      </div>
    </section>
  )
}

