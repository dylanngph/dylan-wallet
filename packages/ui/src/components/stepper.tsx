"use client"

import * as React from "react"
import { motion } from "motion/react"
import { CheckIcon } from "lucide-react"

import { cn } from "../lib/utils"

export interface StepperProps {
  /** Ordered step labels. The count determines the number of steps. */
  steps: string[]
  /** Zero-based index of the current (active) step. */
  current: number
  className?: string
}

/**
 * A horizontal step indicator with animated connectors. Completed steps show a
 * check, the active step is filled, and the connector between completed steps
 * animates its fill via `motion`.
 */
function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn("flex items-center", className)} data-slot="stepper">
      {steps.map((label, index) => {
        const state =
          index < current ? "complete" : index === current ? "active" : "upcoming"
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{ scale: state === "active" ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-none border text-xs font-semibold transition-colors",
                  state === "upcoming" && "border-border text-muted-foreground",
                  state === "active" && "border-primary bg-primary text-primary-foreground",
                  state === "complete" && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {state === "complete" ? <CheckIcon className="size-3.5" /> : index + 1}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="mx-1.5 mb-5 h-0.5 flex-1 overflow-hidden rounded-none bg-border">
                <motion.div
                  initial={false}
                  animate={{ scaleX: index < current ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ originX: 0 }}
                  className="h-full bg-primary"
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export { Stepper }
