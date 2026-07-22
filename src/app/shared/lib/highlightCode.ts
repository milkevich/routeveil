import bash from '@shikijs/langs/bash'
import css from '@shikijs/langs/css'
import tsx from '@shikijs/langs/tsx'
import githubDarkHighContrast from '@shikijs/themes/github-dark-high-contrast'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export type CodeLanguage = 'bash' | 'css' | 'tsx' | 'typescript'

const codeTheme = {
  ...githubDarkHighContrast,
  colors: {
    ...githubDarkHighContrast.colors,
    'editor.background': '#000',
  },
}

const codeHighlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [bash, css, tsx],
  themes: [codeTheme],
})

export async function highlightCode(code: string, language: CodeLanguage) {
  const highlighter = await codeHighlighter
  const grammar = language === 'typescript' ? 'tsx' : language

  return highlighter.codeToHtml(code, {
    lang: grammar,
    theme: 'github-dark-high-contrast',
  })
}
