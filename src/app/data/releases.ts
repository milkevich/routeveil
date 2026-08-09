import type { CodeLanguage } from '../shared/lib/highlightCode'

export type ReleaseCode = {
  filename: string
  language?: CodeLanguage
  value: string
}

type ReleaseSectionBase = {
  title?: string
  titleUrl?: string
  description?: string
}

export type ReleaseListSection = ReleaseSectionBase & {
  type: 'list'
  items?: readonly string[]
}

export type ReleaseBasicSection = ReleaseSectionBase & {
  type: 'basic'
  code?: ReleaseCode
}

export type ReleaseSection =
  | ReleaseListSection
  | ReleaseBasicSection

export type ReleaseEntry = {
  version: string
  date: string
  title: string
  description: string
  sections: readonly ReleaseSection[]
  releaseUrl?: string
}

export function getReleaseId(version: string): string {
  return `v${version.replaceAll('.', '-')}`
}

export const releases = [
  {
    version: '0.4.1',
    date: '2026-08-08',
    title: 'Shared Element Stability',
    description:
      'Shared element transitions are now significantly more reliable and responsive across mobile browsers, complex scrolling layouts, and layered sticky or fixed interface elements.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.4.1',
    sections: [
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Stabilized shared-element destinations across mobile Safari and Chrome',
          'Prevented incoming layouts from shifting shared targets after movement completes',
          'Improved shared-element positioning when navigating to content deep within scrollable pages',
          'Preserved accurate handoff between moving clones and their incoming elements',
          'Improved snapshot performance without changing outgoing page appearance',
          'Reduced delays before shared-element exit transitions begin',
        ],
      },
      {
        type: 'list',
        title: 'Sticky and Fixed Layers',
        items: [
          'Kept higher z-index sticky and fixed elements above shared elements throughout transitions',
          'Allowed promoted sticky and fixed elements to respond immediately while the user scrolls',
          'Removed delayed positioning and snapping after enter or exit completes',
          'Prevented persistent sticky interface outside RouteveilView from flashing during internal destination scrolling',
        ],
      },
      {
        type: 'list',
        title: 'Navigation and Layout',
        items: [
          'Added transitioned history navigation through useRouteveilNavigate(-1)',
          'Added numeric history navigation support to RouteveilLink',
          'Safely coordinates POP navigation with incoming route rendering and shared-element matching',
          'Prevented outgoing pages from visibly scrolling while their exit transition is playing',
          'Prevented incoming routes from inheriting the outgoing route’s document height',
          'Improved handling of lazy-loaded media that affects destination layout',
          'Improved mobile viewport stabilization without changing shared-element movement semantics',
        ],
      },
      {
        type: 'basic',
        title: 'Installation',
        titleUrl: '/docs#installation',
        code: {
          filename: 'Terminal',
          language: 'bash',
          value: 'npm install routeveil@0.4.1',
        },
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-02',
    title: 'Between Rendering',
    description:
      'Routeveil can now render controlled React content between route exit and entry, with readiness holds, minimum timing, and same-page playback.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.4.0',
    sections: [
      {
        type: 'list',
        title: 'Between Rendering',
        titleUrl: '/lab/between',
        description:
          'Render meaningful intermediate states while the destination route prepares.',
        items: [
          'Navigation-level between content through RouteveilLink and useRouteveilNavigate',
          'Incoming-route content through RouteveilBetween',
          'Controlled holds through while and minimum visibility through minDuration',
          'Support for both page and full-screen overlay transition lifecycles',
          'Same-page between playback through useRouteveilTransition',
          'Automatic handoff from navigation fallback content to incoming content',
          'A dedicated Between Render laboratory and expanded documentation',
        ],
      },
      {
        type: 'list',
        title: 'Lifecycle Improvements',
        items: [
          'Preserved layout and scroll behavior during same-page playback',
          'Prevented between rendering and shared-element movement from competing',
          'Improved readiness, interruption, reduced-motion, focus, and cleanup handling',
          'Prevented repeated requests from restarting active navigation',
        ],
      },
      {
        type: 'basic',
        title: 'Installation',
        titleUrl: '/docs#installation',
        code: {
          filename: 'Terminal',
          language: 'bash',
          value: 'npm install routeveil@0.4.0',
        },
      },
    ],
  },
  {
    version: '0.3.1',
    date: '2026-07-31',
    title: 'Transition Request Guard',
    description:
      'Rapid repeated activations now reuse the active transition instead of restarting visual work or committing duplicate navigation.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.3.1',
    sections: [
      {
        type: 'list',
        title: 'Fixed',
        items: [
          'Prevented duplicate transition runs when a link is activated repeatedly',
          'Removed visual flickering caused by rapid double-clicks',
          'Prevented duplicate route commits and history entries',
          'Returned the active transition promise while navigation is already running',
          'Preserved existing focus, interruption, and cleanup behavior',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-31',
    title: 'Unified Transition API',
    description:
      'A redesigned transition input unifies names, options, and independent page phases under one fully typed API.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.3.0',
    sections: [
      {
        type: 'basic',
        title: 'Transition Configuration',
        titleUrl: '/docs#routeveil-link',
        description:
          'Transition options now live directly beside the selected transition name.',
        code: {
          filename: 'Transitions config',
          language: 'tsx',
          value: `transition={{
  name: 'slide',
  direction: 'left',
}}`,
        },
      },
      {
        type: 'basic',
        title: 'Independent Page Phases',
        titleUrl: '/docs#page-transitions',
        description:
          'Page exit and enter phases can use completely different transitions.',
        code: {
          filename: 'Independent phases',
          language: 'tsx',
          value: `transition={{
  exit: 'fade',
  enter: {
    name: 'slide',
    direction: 'up',
  },
}}`,
        },
      },
      {
        type: 'basic',
        title: 'One-sided Transitions',
        description:
          'Either phase can be omitted when only the exit or entry should animate.',
        code: {
          filename: 'One-sided',
          language: 'tsx',
          value: "transition={{ enter: 'fade' }}",
        },
      },
      {
        type: 'list',
        title: 'API Improvements',
        items: [
          'Unified string and configured-object transition inputs',
          'Independent exit and enter definitions for page transitions',
          'Support for instant one-sided exits or entries',
          'Flattened options for page and overlay transitions',
          'Improved transition-specific TypeScript inference',
          'The same transition shape across links, programmatic navigation, and playback',
          'Removed the separate transitionOptions property',
          'Preserved shared elements, preloading, reduced motion, and custom transitions',
        ],
      },
      {
        type: 'basic',
        title: 'Installation',
        titleUrl: '/docs#installation',
        code: {
          filename: 'Terminal',
          language: 'bash',
          value: 'npm install routeveil@0.3.0',
        },
      },
    ],
  },
  {
    version: '0.2.5',
    date: '2026-07-28',
    title: 'Provider Lifecycle Refinements',
    description:
      'Provider internals, shared-element coordination, and transition cleanup were refined for more efficient and dependable navigation.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.2.5',
    sections: [
      {
        type: 'list',
        title: 'Core Lifecycle',
        items: [
          'Reduced unnecessary provider work during active transitions',
          'Improved coordination between navigation state and visual lifecycle state',
          'Refined successful and interrupted cleanup paths',
          'Improved stability around repeated transition activity',
        ],
      },
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Improved coordination between outgoing and incoming shared elements',
          'Refined handoff timing across page transition phases',
          'Improved cleanup after shared movement completes or is interrupted',
        ],
      },
    ],
  },
  {
    version: '0.2.4',
    date: '2026-07-27',
    title: 'Snapshot Pipeline',
    description:
      'A new viewport snapshot pipeline made page transitions more visually stable while improving shared elements, preloading, and mobile performance.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.2.4',
    sections: [
      {
        type: 'list',
        title: 'Page Transitions',
        titleUrl: '/docs#page-transitions',
        items: [
          'Introduced a viewport snapshot pipeline for more reliable page exits and entries',
          'Preserved viewport backgrounds while routed content is transitioning',
          'Improved overflow handling during movement outside normal page bounds',
          'Handled mount animations and delayed visual styles more consistently',
          'Improved resizing behavior and snapshot cleanup',
        ],
      },
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Stabilized handoffs when incoming elements use delayed opacity or filter animations',
          'Removed flashes during rapid back-and-forth navigation',
          'Improved detached-clone cleanup after interrupted transitions',
          'Kept the incoming page interactive as soon as its enter transition completes',
        ],
      },
      {
        type: 'list',
        title: 'Route Preloading',
        titleUrl: '/docs#route-preloading',
        items: [
          'Allowed transitions to begin while remaining destination code finishes loading',
          'Reduced delays when opening previously preloaded routes',
          'Improved mobile behavior for viewport and intent-based preloading',
          'Prevented syntax highlighting work from blocking route entry',
        ],
      },
      {
        type: 'list',
        title: 'Website and Documentation',
        items: [
          'Expanded getting-started and transition guidance',
          'Improved code-block highlighting and mobile clipboard behavior',
          'Updated the home page and primary navigation',
          'Improved the shared-elements playground',
        ],
      },
    ],
  },
  {
    version: '0.2.3',
    date: '2026-07-26',
    title: 'Shared Element Matching',
    description:
      'Shared movement now begins only when Routeveil confirms that a valid matching element exists on the destination route.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.2.3',
    sections: [
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Confirmed incoming matches before activating outgoing shared elements',
          'Prevented unmatched elements from remaining above the outgoing page',
          'Allowed routes without matches to fall back to the normal page transition',
          'Preserved route-wide sharing when navigation is triggered by a separate Back control',
          'Moved valid partial matches while allowing unmatched elements to exit normally',
        ],
      },
      {
        type: 'basic',
        description:
          'No new props or public API changes were required for the safer matching behavior.',
      },
    ],
  },
  {
    version: '0.2.2',
    date: '2026-07-25',
    title: 'Route-wide Shared Elements',
    description:
      'Shared-element navigation can now be triggered by controls outside the element being moved.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.2.2',
    sections: [
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Enabled shared movement from links and buttons outside the registered element',
          'Allowed sharedElements="auto" to fall back to valid route-wide candidates',
          'Continued prioritizing candidates directly related to the navigation trigger',
          'Fixed separate Back controls that previously moved only the page',
          'Preserved gallery and card navigation behavior based on trigger proximity',
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-07-25',
    title: 'Preloading and Route Readiness',
    description:
      'Routes and their visual dependencies can now be prepared before reveal, reducing delays between navigation and the incoming transition.',
    releaseUrl:
      'https://github.com/milkevich/routeveil/releases/tag/v0.2.1',
    sections: [
      {
        type: 'list',
        title: 'Route Preloading',
        titleUrl: '/docs#route-preloading',
        items: [
          'Added automatic lazy-route preloading for transitioned RouteveilLink destinations',
          'Added provider-level preload defaults',
          'Added per-link preload overrides',
          'Added intent, viewport, and render preload strategies',
          'Reused preloads already in progress when navigation begins',
          'Prepared lazy destination modules before the outgoing transition starts',
        ],
      },
      {
        type: 'list',
        title: 'Route Readiness',
        titleUrl: '/docs#route-readiness',
        items: [
          'Added useRouteveilPendingWork for destination work that must finish before reveal',
          'Allowed page transitions to wait before entering',
          'Allowed overlay transitions to wait while fully covered',
          'Improved coordination with asynchronously rendered destination content',
        ],
      },
      {
        type: 'list',
        title: 'Failure Recovery',
        items: [
          'Allowed failed route preloads to continue through safe normal navigation',
          'Added safety timeouts so pending work cannot trap a transition',
          'Released timed-out readiness work predictably',
          'Kept preloading opt-in for ordinary React Router navigation',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-25',
    title: 'Shared Element Transitions',
    description:
      'Routeveil gained coordinated visual movement between matching elements on outgoing and incoming React Router routes.',
    sections: [
      {
        type: 'list',
        title: 'Shared Elements',
        titleUrl: '/lab/shared-elements',
        items: [
          'Introduced RouteveilSharedElement for matching visuals across routes',
          'Moved multiple uniquely named elements during page-transition navigation',
          'Added explicit outgoing source selection through sharedElements',
          'Scoped automatic selection to elements related to the activated link',
          'Allowed missing incoming targets to fall back without consuming the readiness deadline',
          'Added lifecycle, selection, compatibility, package, documentation, and demo coverage',
        ],
      },
      {
        type: 'list',
        title: 'Scroll Anchoring',
        items: [
          'Added exact-name incoming anchors through scrollToSharedElement',
          'Supported shared-element positioning on RouteveilLink',
          'Supported the same positioning through programmatic navigation',
          'Preserved normal scroll behavior when an anchor cannot be resolved',
        ],
      },
      {
        type: 'list',
        title: 'Navigation Reliability',
        items: [
          'Hardened interruption, focus, timeout, cleanup, and unmount behavior',
          'Documented the ignore-while-active concurrency policy',
          'Improved handling for navigation initiated outside Routeveil',
          'Expanded lifecycle and browser-history coverage',
          'Verified React 18 and React Router DOM 6.27 compatibility',
        ],
      },
      {
        type: 'basic',
        title: 'Installation',
        titleUrl: '/docs#installation',
        code: {
          filename: 'Terminal',
          language: 'bash',
          value: 'npm install routeveil@0.2.0',
        },
      },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-07-22',
    title: 'Production Readiness',
    description:
      'This release strengthened Routeveil’s package output, documentation, metadata, deployment setup, and browser behavior after the initial launch.',
    sections: [
      {
        type: 'list',
        title: 'Package and Documentation',
        items: [
          'Corrected package output and public metadata',
          'Clarified installation and the routeveil/react-router entry point',
          'Expanded setup, router integration, and transition documentation',
          'Improved browser compatibility details and package verification',
        ],
      },
      {
        type: 'list',
        title: 'Runtime and Testing',
        items: [
          'Refined pixel-overlay runtime behavior',
          'Expanded overlay and metadata test coverage',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-21',
    title: 'Core Transition Engine',
    description:
      'Routeveil’s first public build established its typed page and full-screen overlay transition engine for React Router.',
    sections: [
      {
        type: 'list',
        title: 'Page Transitions',
        titleUrl: '/docs#page-transitions',
        items: [
          'Per-navigation animation of the active RouteveilView',
          'Separate outgoing exit and incoming enter phases',
          'Persistent interface support outside the transitioning route view',
          'Reduced-motion handling for decorative movement',
          'Built-in fade, blur, slide, spin, rotate, bounce, push, and pull transitions',
        ],
      },
      {
        type: 'list',
        title: 'Overlay Transitions',
        titleUrl: '/docs#overlay-transitions',
        items: [
          'Full-screen overlays rendered through a document.body portal',
          'Opaque route-change coverage followed by incoming-route reveal',
          'Runtime options for direction, origin, color, duration, easing, grids, and stagger',
          'Built-in pixel, curtain, wipe, columns, rows, iris, halo, tunnel, clock, venetian, mosaic, and dissolve transitions',
        ],
      },
      {
        type: 'list',
        title: 'Router Integration',
        titleUrl: '/docs#quick-start',
        items: [
          'RouteveilProvider for transition coordination',
          'RouteveilView for the routed region being animated',
          'RouteveilLink for per-navigation transition selection',
          'useRouteveilNavigate for programmatic navigation',
          'Support for declarative React Router routes',
          'Support for data routers and layout routes',
          'Safe fallback to ordinary navigation when no transition is selected',
        ],
      },
      {
        type: 'list',
        title: 'Playback and Customization',
        items: [
          'Same-page transition previews through useRouteveilTransition',
          'Provider-level custom page transition definitions',
          'Typed public APIs and included TypeScript declarations',
          'Ignore-while-active handling for concurrent requests',
          'Safe cleanup after completed and interrupted visual work',
        ],
      },
      {
        type: 'basic',
        title: 'Installation',
        titleUrl: '/docs#installation',
        code: {
          filename: 'Terminal',
          language: 'bash',
          value: 'npm install routeveil@0.1.0',
        },
      },
    ],
  },
] as const satisfies readonly ReleaseEntry[]