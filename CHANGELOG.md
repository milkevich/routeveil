# Changelog

Notable changes to Routeveil are documented here.

## 0.4.0 - 2026-08-02

**Between Rendering**

Routeveil can now render controlled React content between route exit and entry, with readiness holds, minimum timing, and same-page playback.

### [Between Rendering](https://www.routeveil.dev/lab/between)

Render meaningful intermediate states while the destination route prepares.

- Navigation-level between content through RouteveilLink and useRouteveilNavigate
- Incoming-route content through RouteveilBetween
- Controlled holds through while and minimum visibility through minDuration
- Support for both page and full-screen overlay transition lifecycles
- Same-page between playback through useRouteveilTransition
- Automatic handoff from navigation fallback content to incoming content
- A dedicated Between Render laboratory and expanded documentation

### Lifecycle Improvements

- Preserved layout and scroll behavior during same-page playback
- Prevented between rendering and shared-element movement from competing
- Improved readiness, interruption, reduced-motion, focus, and cleanup handling
- Prevented repeated requests from restarting active navigation

### [Installation](https://www.routeveil.dev/docs#installation)

```bash
npm install routeveil@0.4.0
```

## 0.3.1 - 2026-07-31

**Transition Request Guard**

Rapid repeated activations now reuse the active transition instead of restarting visual work or committing duplicate navigation.

### Fixed

- Prevented duplicate transition runs when a link is activated repeatedly
- Removed visual flickering caused by rapid double-clicks
- Prevented duplicate route commits and history entries
- Returned the active transition promise while navigation is already running
- Preserved existing focus, interruption, and cleanup behavior

## 0.3.0 - 2026-07-31

**Unified Transition API**

A redesigned transition input unifies names, options, and independent page phases under one fully typed API.

### [Transition Configuration](https://www.routeveil.dev/docs#routeveil-link)

Transition options now live directly beside the selected transition name.

```tsx
transition={{
  name: 'slide',
  direction: 'left',
}}
```

### [Independent Page Phases](https://www.routeveil.dev/docs#page-transitions)

Page exit and enter phases can use completely different transitions.

```tsx
transition={{
  exit: 'fade',
  enter: {
    name: 'slide',
    direction: 'up',
  },
}}
```

### One-sided Transitions

Either phase can be omitted when only the exit or entry should animate.

```tsx
transition={{ enter: 'fade' }}
```

### API Improvements

- Unified string and configured-object transition inputs
- Independent exit and enter definitions for page transitions
- Support for instant one-sided exits or entries
- Flattened options for page and overlay transitions
- Improved transition-specific TypeScript inference
- The same transition shape across links, programmatic navigation, and playback
- Removed the separate transitionOptions property
- Preserved shared elements, preloading, reduced motion, and custom transitions

### [Installation](https://www.routeveil.dev/docs#installation)

```bash
npm install routeveil@0.3.0
```

## 0.2.5 - 2026-07-28

**Provider Lifecycle Refinements**

Provider internals, shared-element coordination, and transition cleanup were refined for more efficient and dependable navigation.

### Core Lifecycle

- Reduced unnecessary provider work during active transitions
- Improved coordination between navigation state and visual lifecycle state
- Refined successful and interrupted cleanup paths
- Improved stability around repeated transition activity

### [Shared Elements](https://www.routeveil.dev/lab/shared-elements)

- Improved coordination between outgoing and incoming shared elements
- Refined handoff timing across page transition phases
- Improved cleanup after shared movement completes or is interrupted

## 0.2.4 - 2026-07-27

**Snapshot Pipeline**

A new viewport snapshot pipeline made page transitions more visually stable while improving shared elements, preloading, and mobile performance.

### [Page Transitions](https://www.routeveil.dev/docs#page-transitions)

- Introduced a viewport snapshot pipeline for more reliable page exits and entries
- Preserved viewport backgrounds while routed content is transitioning
- Improved overflow handling during movement outside normal page bounds
- Handled mount animations and delayed visual styles more consistently
- Improved resizing behavior and snapshot cleanup

### [Shared Elements](https://www.routeveil.dev/lab/shared-elements)

- Stabilized handoffs when incoming elements use delayed opacity or filter animations
- Removed flashes during rapid back-and-forth navigation
- Improved detached-clone cleanup after interrupted transitions
- Kept the incoming page interactive as soon as its enter transition completes

### [Route Preloading](https://www.routeveil.dev/docs#route-preloading)

- Allowed transitions to begin while remaining destination code finishes loading
- Reduced delays when opening previously preloaded routes
- Improved mobile behavior for viewport and intent-based preloading
- Prevented syntax highlighting work from blocking route entry

### Website and Documentation

- Expanded getting-started and transition guidance
- Improved code-block highlighting and mobile clipboard behavior
- Updated the home page and primary navigation
- Improved the shared-elements playground

## 0.2.3 - 2026-07-26

**Shared Element Matching**

Shared movement now begins only when Routeveil confirms that a valid matching element exists on the destination route.

### [Shared Elements](https://www.routeveil.dev/lab/shared-elements)

- Confirmed incoming matches before activating outgoing shared elements
- Prevented unmatched elements from remaining above the outgoing page
- Allowed routes without matches to fall back to the normal page transition
- Preserved route-wide sharing when navigation is triggered by a separate Back control
- Moved valid partial matches while allowing unmatched elements to exit normally

No new props or public API changes were required for the safer matching behavior.

## 0.2.2 - 2026-07-25

**Route-wide Shared Elements**

Shared-element navigation can now be triggered by controls outside the element being moved.

### [Shared Elements](https://www.routeveil.dev/lab/shared-elements)

- Enabled shared movement from links and buttons outside the registered element
- Allowed sharedElements="auto" to fall back to valid route-wide candidates
- Continued prioritizing candidates directly related to the navigation trigger
- Fixed separate Back controls that previously moved only the page
- Preserved gallery and card navigation behavior based on trigger proximity

## 0.2.1 - 2026-07-25

**Preloading and Route Readiness**

Routes and their visual dependencies can now be prepared before reveal, reducing delays between navigation and the incoming transition.

### [Route Preloading](https://www.routeveil.dev/docs#route-preloading)

- Added automatic lazy-route preloading for transitioned RouteveilLink destinations
- Added provider-level preload defaults
- Added per-link preload overrides
- Added intent, viewport, and render preload strategies
- Reused preloads already in progress when navigation begins
- Prepared lazy destination modules before the outgoing transition starts

### [Route Readiness](https://www.routeveil.dev/docs#route-readiness)

- Added useRouteveilPendingWork for destination work that must finish before reveal
- Allowed page transitions to wait before entering
- Allowed overlay transitions to wait while fully covered
- Improved coordination with asynchronously rendered destination content

### Failure Recovery

- Allowed failed route preloads to continue through safe normal navigation
- Added safety timeouts so pending work cannot trap a transition
- Released timed-out readiness work predictably
- Kept preloading opt-in for ordinary React Router navigation

## 0.2.0 - 2026-07-25

**Shared Element Transitions**

Routeveil gained coordinated visual movement between matching elements on outgoing and incoming React Router routes.

### [Shared Elements](https://www.routeveil.dev/lab/shared-elements)

- Introduced RouteveilSharedElement for matching visuals across routes
- Moved multiple uniquely named elements during page-transition navigation
- Added explicit outgoing source selection through sharedElements
- Scoped automatic selection to elements related to the activated link
- Allowed missing incoming targets to fall back without consuming the readiness deadline
- Added lifecycle, selection, compatibility, package, documentation, and demo coverage

### Scroll Anchoring

- Added exact-name incoming anchors through scrollToSharedElement
- Supported shared-element positioning on RouteveilLink
- Supported the same positioning through programmatic navigation
- Preserved normal scroll behavior when an anchor cannot be resolved

### Navigation Reliability

- Hardened interruption, focus, timeout, cleanup, and unmount behavior
- Documented the ignore-while-active concurrency policy
- Improved handling for navigation initiated outside Routeveil
- Expanded lifecycle and browser-history coverage
- Verified React 18 and React Router DOM 6.27 compatibility

### [Installation](https://www.routeveil.dev/docs#installation)

```bash
npm install routeveil@0.2.0
```

## 0.1.1 - 2026-07-22

**Production Readiness**

This release strengthened Routeveil’s package output, documentation, metadata, deployment setup, and browser behavior after the initial launch.

### Package and Documentation

- Corrected package output and public metadata
- Clarified installation and the routeveil/react-router entry point
- Expanded setup, router integration, and transition documentation
- Improved browser compatibility details and package verification

### Runtime and Testing

- Refined pixel-overlay runtime behavior
- Expanded overlay and metadata test coverage

## 0.1.0 - 2026-07-21

**Core Transition Engine**

Routeveil’s first public build established its typed page and full-screen overlay transition engine for React Router.

### [Page Transitions](https://www.routeveil.dev/docs#page-transitions)

- Per-navigation animation of the active RouteveilView
- Separate outgoing exit and incoming enter phases
- Persistent interface support outside the transitioning route view
- Reduced-motion handling for decorative movement
- Built-in fade, blur, slide, spin, rotate, bounce, push, and pull transitions

### [Overlay Transitions](https://www.routeveil.dev/docs#overlay-transitions)

- Full-screen overlays rendered through a document.body portal
- Opaque route-change coverage followed by incoming-route reveal
- Runtime options for direction, origin, color, duration, easing, grids, and stagger
- Built-in pixel, curtain, wipe, columns, rows, iris, halo, tunnel, clock, venetian, mosaic, and dissolve transitions

### [Router Integration](https://www.routeveil.dev/docs#quick-start)

- RouteveilProvider for transition coordination
- RouteveilView for the routed region being animated
- RouteveilLink for per-navigation transition selection
- useRouteveilNavigate for programmatic navigation
- Support for declarative React Router routes
- Support for data routers and layout routes
- Safe fallback to ordinary navigation when no transition is selected

### Playback and Customization

- Same-page transition previews through useRouteveilTransition
- Provider-level custom page transition definitions
- Typed public APIs and included TypeScript declarations
- Ignore-while-active handling for concurrent requests
- Safe cleanup after completed and interrupted visual work

### [Installation](https://www.routeveil.dev/docs#installation)

```bash
npm install routeveil@0.1.0
```
