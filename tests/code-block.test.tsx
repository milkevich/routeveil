import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeBlock } from '../src/app/shared/UI/CodeBlock'
import { highlightCode } from '../src/app/shared/lib/highlightCode'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

describe('CodeBlock', () => {
  it('highlights with GitHub Dark High Contrast on a pure black background', async () => {
    const html = await highlightCode('const answer: number = 42', 'typescript')

    expect(html).toContain('class="shiki github-dark-high-contrast"')
    expect(html).toContain('background-color:#000')
    expect(html).toMatch(/style="color:#[0-9a-f]{6}"/i)
  })

  it('shows a filename and copies the unmodified source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const source = 'const answer = 42'

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const view = render(
      <CodeBlock filename="answer.ts" language="typescript">
        {source}
      </CodeBlock>,
    )

    expect(view.getByText('answer.ts')).toBeVisible()

    await waitFor(() => {
      expect(view.container.querySelector('.shiki')).toBeInTheDocument()
    })

    const copyButton = view.getByRole('button', { name: 'Copy answer.ts' })

    expect(copyButton.querySelector('[data-icon="copy"]')).toBeInTheDocument()
    expect(copyButton.querySelector('[data-icon="check"]')).not.toBeInTheDocument()

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(source)
      const copiedButton = view.getByRole('button', { name: 'Copied answer.ts' })

      expect(copiedButton).toHaveAttribute('data-state', 'copied')
      expect(copiedButton.querySelector('[data-icon="copy"]')).not.toBeInTheDocument()
      expect(copiedButton.querySelector('[data-icon="check"]')).toBeInTheDocument()
    })
  })
})
