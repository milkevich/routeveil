import { useEffect, useRef, useState } from 'react'
import type { CodeLanguage } from '../lib/highlightCode'
import { Check, Copy } from 'lucide-react'

type CopyState = 'idle' | 'copied' | 'error'

type HighlightedCode = {
  html: string
  key: string
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
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [highlightedCode, setHighlightedCode] = useState<HighlightedCode>()
  const resetTimer = useRef<number>(undefined)
  const highlightKey = `${language}\u0000${children}`
  const highlightedHtml = highlightedCode?.key === highlightKey
    ? highlightedCode.html
    : undefined

  useEffect(() => {
    let active = true

    void import('../lib/highlightCode')
      .then(({ highlightCode }) => highlightCode(children, language))
      .then((html) => {
        if (active) {
          setHighlightedCode({ html, key: highlightKey })
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
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
