"use client"

import * as React from "react"
import type { ChartTooltipProps, ChartTooltipContentProps } from "recharts"

export const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => <div ref={ref} {...props} />,
)
ChartContainer.displayName = "ChartContainer"

export const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps<any, any>>(
  ({ content, ...props }, ref) => (
    <div ref={ref} {...props}>
      {content}
    </div>
  ),
)
ChartTooltip.displayName = "ChartTooltip"

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps<any, any>>(
  ({ active, payload, label, ...props }, ref) => {
    if (active && payload && payload.length) {
      return (
        <div ref={ref} className="rounded-lg border bg-background p-2 shadow-sm" {...props}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{label}</span>
              <span className="font-bold text-muted-foreground">{payload[0].value}</span>
            </div>
          </div>
        </div>
      )
    }

    return null
  },
)
ChartTooltipContent.displayName = "ChartTooltipContent"

