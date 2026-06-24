"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./button"

function splitWords(phrase: string): string[] {
  return phrase.split(/\s+/).filter(Boolean)
}

export interface SeedPhraseInputProps {
  /** Number of word slots to render (12 or 24). */
  wordCount?: number
  /** Current phrase (space-separated). */
  value: string
  /** Called with the normalized phrase whenever any slot changes. */
  onChange: (phrase: string) => void
  className?: string
}

/**
 * A segmented recovery-phrase input — one numbered box per word, in the spirit
 * of an OTP input. Pasting a full phrase into any box distributes the words
 * across slots; Enter/Space/arrows move focus between boxes.
 */
function SeedPhraseInput({
  wordCount = 12,
  value,
  onChange,
  className,
}: SeedPhraseInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const words = React.useMemo(() => {
    const parts = value.split(" ")
    return Array.from({ length: wordCount }, (_, i) => parts[i] ?? "")
  }, [value, wordCount])

  const commit = (next: string[]) => onChange(next.join(" ").replace(/\s+$/, ""))

  const setWord = (index: number, raw: string) => {
    const next = [...words]
    next[index] = raw.trim()
    commit(next)
  }

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = splitWords(event.clipboardData.getData("text"))
    if (pasted.length <= 1) return
    event.preventDefault()
    const next = [...words]
    pasted.forEach((word, offset) => {
      if (index + offset < wordCount) next[index + offset] = word
    })
    commit(next)
    refs.current[Math.min(index + pasted.length, wordCount) - 1]?.focus()
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === " " || event.key === "Enter") && words[index]) {
      event.preventDefault()
      refs.current[Math.min(index + 1, wordCount - 1)]?.focus()
    } else if (event.key === "Backspace" && !words[index] && index > 0) {
      event.preventDefault()
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)} data-slot="seed-phrase-input">
      {words.map((word, index) => (
        <div key={index} className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <input
            ref={(el) => {
              refs.current[index] = el
            }}
            value={word}
            onChange={(e) => setWord(index, e.target.value)}
            onPaste={(e) => handlePaste(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-9 w-full rounded-none border bg-transparent pr-2 pl-6 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
      ))}
    </div>
  )
}

export interface SeedPhraseDisplayProps {
  /** Phrase to display (space-separated). */
  phrase: string
  /** Show a copy-to-clipboard button. */
  copyable?: boolean
  className?: string
}

/** Read-only numbered grid of recovery-phrase words, with optional copy button. */
function SeedPhraseDisplay({ phrase, copyable = true, className }: SeedPhraseDisplayProps) {
  const [copied, setCopied] = React.useState(false)
  const words = splitWords(phrase)

  const copy = async () => {
    await navigator.clipboard.writeText(words.join(" "))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className={cn("space-y-2", className)} data-slot="seed-phrase-display">
      <ol className="grid grid-cols-3 gap-2 rounded-none border bg-muted/40 p-3 text-sm">
        {words.map((word, index) => (
          <li key={index} className="flex gap-1.5">
            <span className="tabular-nums text-muted-foreground">{index + 1}.</span>
            <span className="font-medium">{word}</span>
          </li>
        ))}
      </ol>
      {copyable && (
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </div>
  )
}

export { SeedPhraseInput, SeedPhraseDisplay }
