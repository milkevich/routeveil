import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useRouteveilContext } from '../../../react-router/RouteveilContext.js'
import {
  highlightCode,
  type CodeLanguage,
} from '../lib/highlightCode'

type CopyState = 'idle' | 'copied' | 'error'

type HighlightedCode = {
  html: string
  key: string
}

type HighlightQueueJob = {
  cancelled: boolean
  run: () => Promise<void>
}

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number
}

type CodeBlockProps = {
  children: string
  filename: string
  language?: CodeLanguage
}

const highlightCache = new Map<string, Promise<string>>()
const highlightQueue: HighlightQueueJob[] = []
let highlightQueueScheduled = false

function getHighlightedCode(
  key: string,
  code: string,
  language: CodeLanguage,
): Promise<string> {
  const cached = highlightCache.get(key)

  if (cached) {
    return cached
  }

  const promise = highlightCode(code, language)

  highlightCache.set(key, promise)
  void promise.catch(() => {
    if (highlightCache.get(key) === promise) {
      highlightCache.delete(key)
    }
  })

  return promise
}

function scheduleHighlightQueue(): void {
  if (
    highlightQueueScheduled
    || highlightQueue.length === 0
    || typeof window === 'undefined'
  ) {
    return
  }

  highlightQueueScheduled = true

  const runNext = () => {
    highlightQueueScheduled = false

    let job = highlightQueue.shift()

    while (job?.cancelled) {
      job = highlightQueue.shift()
    }

    if (!job) {
      return
    }

    void job.run().finally(scheduleHighlightQueue)
  }

  const requestIdleCallback = (window as IdleWindow).requestIdleCallback

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(runNext, { timeout: 500 })
  } else {
    window.setTimeout(runNext, 0)
  }
}

function enqueueHighlight(run: () => Promise<void>): () => void {
  const job: HighlightQueueJob = {
    cancelled: false,
    run,
  }

  highlightQueue.push(job)
  scheduleHighlightQueue()

  return () => {
    job.cancelled = true
  }
}

async function writeClipboardText(text: string): Promise<void> {
  if (
    typeof navigator.clipboard?.writeText === 'function'
    && window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  const activeElement = document.activeElement

  textarea.value = text
  textarea.readOnly = true
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto -9999px'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.fontSize = '16px'
  document.body.append(textarea)

  textarea.focus({ preventScroll: true })
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const copied = document.execCommand('copy')
  textarea.remove()

  if (activeElement instanceof HTMLElement) {
    activeElement.focus({ preventScroll: true })
  }

  if (!copied) {
    throw new Error('Clipboard copy failed.')
  }
}

export function CodeBlock({
  children,
  filename,
  language = 'tsx',
}: CodeBlockProps) {
  const { phase } = useRouteveilContext()
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [highlightedCode, setHighlightedCode] = useState<HighlightedCode>()
  const resetTimer = useRef<number>(undefined)
  const highlightKey = `${language}\u0000${children}`
  const highlightedHtml = highlightedCode?.key === highlightKey
    ? highlightedCode.html
    : undefined

  useEffect(() => {
    if (phase !== 'idle' || highlightedHtml) {
      return
    }

    let active = true
    const cancel = enqueueHighlight(async () => {
      try {
        const html = await getHighlightedCode(
          highlightKey,
          children,
          language,
        )

        if (active) {
          setHighlightedCode({ html, key: highlightKey })
        }
      } catch {
        return
      }
    })

    return () => {
      active = false
      cancel()
    }
  }, [children, highlightKey, highlightedHtml, language, phase])

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function copyCode() {
    window.clearTimeout(resetTimer.current)

    try {
      await writeClipboardText(children)
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