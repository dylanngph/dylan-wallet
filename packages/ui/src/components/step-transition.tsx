"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "../lib/utils"

export interface StepTransitionProps {
  /** Unique key for the current step; changing it triggers the transition. */
  stepKey: React.Key
  /** 1 = moving forward (slide left), -1 = moving back (slide right). */
  direction?: 1 | -1
  className?: string
  children: React.ReactNode
}

const variants = {
  enter: (direction: number) => ({ x: `${direction * 24}%`, opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: number) => ({ x: `${direction * -24}%`, opacity: 0 }),
}

/**
 * Animates between sequential steps with a directional slide + fade. Uses
 * `mode="wait"` so the outgoing step finishes exiting before the next enters —
 * avoiding overlap in fixed-width containers like an extension popup. Respects
 * `prefers-reduced-motion` automatically via `motion`.
 */
function StepTransition({ stepKey, direction = 1, className, children }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className={cn("flex flex-1 flex-col", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export { StepTransition }
