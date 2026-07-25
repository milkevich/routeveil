import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CodeLanguage } from '../lib/highlightCode'
import { Check, Copy } from 'lucide-react'
import { useRouteveilPendingWork } from '../../../react-router'

type CopyState = 'idle' | 'copied' | 'error'

type HighlightedCode = {
  html: string
  key: string
}

type PendingHighlight = {
  key: string
  settle: () => void
}

type CodeBlockProps = {
  children: string
  filename: string
  language?: CodeLanguage
}

export function CodeBlock({
  children,
  filename,
  language = 'tsx',
}: CodeBlockProps) {
  const registerPendingWork = useRouteveilPendingWork()
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [highlightedCode, setHighlightedCode] = useState<HighlightedCode>()
  const resetTimer = useRef<number>(undefined)
  const pendingHighlightRef = useRef<PendingHighlight | null>(null)
  const highlightKey = `${language}\u0000${children}`
  const highlightedHtml = highlightedCode?.key === highlightKey
    ? highlightedCode.html
    : undefined

  useLayoutEffect(() => {
    let settled = false
    let resolvePendingWork!: () => void
    const pendingWork = new Promise<void>((resolve) => {
      resolvePendingWork = resolve
    })
    const releasePendingWork = registerPendingWork(pendingWork)
    const pendingHighlight: PendingHighlight = {
      key: highlightKey,
      settle: () => {
        if (settled) {
          return
        }

        settled = true
        resolvePendingWork()
        releasePendingWork()
      },
    }

    pendingHighlightRef.current = pendingHighlight

    return () => {
      if (pendingHighlightRef.current === pendingHighlight) {
        pendingHighlightRef.current = null
      }

      pendingHighlight.settle()
    }
  }, [highlightKey, registerPendingWork])

  useEffect(() => {
    let active = true
    let firstFrame = 0
    let secondFrame = 0
    const pendingHighlight = pendingHighlightRef.current

    const startHighlighting = () => {
      secondFrame = 0

      void import('../lib/highlightCode')
        .then(({ highlightCode }) => highlightCode(children, language))
        .then((html) => {
          if (active) {
            setHighlightedCode({ html, key: highlightKey })
          }
        })
        .catch(() => undefined)
        .finally(() => pendingHighlight?.settle())
    }

    if (typeof window.requestAnimationFrame === 'function') {
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0
        secondFrame = window.requestAnimationFrame(startHighlighting)
      })
    } else {
      startHighlighting()
    }

    return () => {
      active = false

      if (firstFrame) {
        window.cancelAnimationFrame(firstFrame)
      }

      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame)
      }

      pendingHighlight?.settle()
    }
  }, [children, highlightKey, language])

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function copyCode() {
    window.clearTimeout(resetTimer.current)

    try {
      await navigator.clipboard.writeText(children)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }

    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800)
  }

  const copyLabel = copyState === 'copied'
    ? 'Copied'
    : copyState === 'error'
      ? 'Try again'
      : 'Copy'

  return (
    <div className="code-block">
      <div className="code-block__header">
        <span className="code-block__filename">{filename}</span>
        <button
          aria-label={`${copyLabel} ${filename}`}
          className="code-block__copy"
          data-state={copyState}
          onClick={copyCode}
          type="button"
        >
          {copyState === 'copied' ? (
            <Check aria-hidden="true" data-icon="check" strokeWidth={2.5} />
          ) : (
            <Copy aria-hidden="true" data-icon="copy" strokeWidth={2.5} />
          )}
        </button>
      </div>
      <div className="code-block__body">
        {highlightedHtml ? (
          <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        ) : (
          <pre tabIndex={0}><code>{children}</code></pre>
        )}
      </div>
    </div>
  )
}
