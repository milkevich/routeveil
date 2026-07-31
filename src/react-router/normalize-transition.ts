import type {
  AnimationPhaseDefinition,
  OverlayTransitionDefinition,
  PageTransitionDefinition,
  TransitionDefinition,
} from '../core/index.js'

type TransitionRegistry = Readonly<Record<string, TransitionDefinition>>

type TransitionConfiguration = Record<string, unknown>

export type TransitionNormalizationIssue =
  | {
      type: 'invalid-input'
      phase: 'complete' | 'exit' | 'enter'
    }
  | {
      type: 'overlay-page-phase'
      name: string
      phase: 'exit' | 'enter'
    }
  | {
      type: 'resolution-error'
      error: unknown
      name: string
      phase: 'complete' | 'exit' | 'enter'
    }
  | {
      type: 'unknown-transition'
      name: string
      phase: 'complete' | 'exit' | 'enter'
    }

export type NormalizedPagePhase = {
  name: string
  definition: PageTransitionDefinition
  options: unknown
  phase: AnimationPhaseDefinition
}

export type NormalizedPageTransition = {
  type: 'page'
  exit: NormalizedPagePhase | null
  enter: NormalizedPagePhase | null
  issues: TransitionNormalizationIssue[]
}

export type NormalizedOverlayTransition = {
  type: 'overlay'
  name: string
  definition: OverlayTransitionDefinition
  options: unknown
  issues: TransitionNormalizationIssue[]
}

export type NormalizedInvalidTransition = {
  type: 'invalid'
  issues: TransitionNormalizationIssue[]
}

export type NormalizedTransition =
  | NormalizedPageTransition
  | NormalizedOverlayTransition
  | NormalizedInvalidTransition

type ParsedTransitionInput = {
  name: string
  options: unknown
}

function isConfiguration(value: unknown): value is TransitionConfiguration {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTransitionInput(value: unknown): ParsedTransitionInput | null {
  if (typeof value === 'string') {
    return {
      name: value,
      options: undefined,
    }
  }

  if (!isConfiguration(value) || typeof value.name !== 'string') {
    return null
  }

  const { name, ...options } = value

  return {
    name,
    options,
  }
}

function resolvePagePhase(
  input: unknown,
  phase: 'exit' | 'enter',
  registry: TransitionRegistry,
  issues: TransitionNormalizationIssue[],
): NormalizedPagePhase | null {
  const parsed = parseTransitionInput(input)

  if (!parsed) {
    issues.push({ type: 'invalid-input', phase })
    return null
  }

  const definition = registry[parsed.name]

  if (!definition || (definition.type !== 'page' && definition.type !== 'overlay')) {
    issues.push({
      type: 'unknown-transition',
      name: parsed.name,
      phase,
    })
    return null
  }

  if (definition.type === 'overlay') {
    issues.push({
      type: 'overlay-page-phase',
      name: parsed.name,
      phase,
    })
    return null
  }

  try {
    const resolved = definition.resolve?.(parsed.options) ?? definition

    return {
      name: parsed.name,
      definition,
      options: parsed.options,
      phase: resolved[phase],
    }
  } catch (error) {
    issues.push({
      type: 'resolution-error',
      error,
      name: parsed.name,
      phase,
    })
    return null
  }
}

function normalizeCompleteTransition(
  input: unknown,
  registry: TransitionRegistry,
): NormalizedTransition {
  const issues: TransitionNormalizationIssue[] = []
  const parsed = parseTransitionInput(input)

  if (!parsed) {
    return {
      type: 'invalid',
      issues: [{ type: 'invalid-input', phase: 'complete' }],
    }
  }

  const definition = registry[parsed.name]

  if (!definition || (definition.type !== 'page' && definition.type !== 'overlay')) {
    return {
      type: 'invalid',
      issues: [{
        type: 'unknown-transition',
        name: parsed.name,
        phase: 'complete',
      }],
    }
  }

  if (definition.type === 'overlay') {
    return {
      type: 'overlay',
      name: parsed.name,
      definition,
      options: parsed.options,
      issues,
    }
  }

  try {
    const resolved = definition.resolve?.(parsed.options) ?? definition

    return {
      type: 'page',
      exit: {
        name: parsed.name,
        definition,
        options: parsed.options,
        phase: resolved.exit,
      },
      enter: {
        name: parsed.name,
        definition,
        options: parsed.options,
        phase: resolved.enter,
      },
      issues,
    }
  } catch (error) {
    return {
      type: 'invalid',
      issues: [{
        type: 'resolution-error',
        error,
        name: parsed.name,
        phase: 'complete',
      }],
    }
  }
}

export function normalizeTransition(
  input: unknown,
  registry: TransitionRegistry,
): NormalizedTransition {
  if (
    !isConfiguration(input)
    || (!('exit' in input) && !('enter' in input))
  ) {
    return normalizeCompleteTransition(input, registry)
  }

  if ('name' in input) {
    return {
      type: 'invalid',
      issues: [{ type: 'invalid-input', phase: 'complete' }],
    }
  }

  const issues: TransitionNormalizationIssue[] = []
  const exit = 'exit' in input && input.exit !== undefined
    ? resolvePagePhase(input.exit, 'exit', registry, issues)
    : null
  const enter = 'enter' in input && input.enter !== undefined
    ? resolvePagePhase(input.enter, 'enter', registry, issues)
    : null

  if (!exit && !enter) {
    if (issues.length === 0) {
      issues.push({ type: 'invalid-input', phase: 'complete' })
    }

    return {
      type: 'invalid',
      issues,
    }
  }

  return {
    type: 'page',
    exit,
    enter,
    issues,
  }
}
