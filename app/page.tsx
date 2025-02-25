"use client"

import { Navbar } from "@/components/ui/navbar"
import { Hero } from "@/components/ui/hero"
import { BentoGrid } from "@/components/ui/bentogrid"
import { RoadSafetySection } from "@/components/ui/roadsafety"
import { motion } from "framer-motion"
import { Fragment } from "react"

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="flex flex-col size-full min-h-screen items-start justify-start"
    >
      <Fragment>
        <div className="absolute size-full z-0">
          <div className="relative size-full bg-white">
            <div className="absolute size-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          </div>
        </div>
        <div className="relative size-full z-1">
          <main>
            <Navbar />
            <Hero />
            <BentoGrid />
            <RoadSafetySection />
          </main>
        </div>
      </Fragment>
    </motion.div>
  )
}

