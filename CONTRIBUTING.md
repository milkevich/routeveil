# Contributing

Routeveil welcomes focused bug reports, documentation improvements, tests, and implementation changes.

## Development setup

Use Node.js 22 or a compatible current Node.js release.

```bash
npm ci
npm run dev
```

## Before submitting a change

Keep changes scoped, preserve the public API unless a change is discussed first, and add deterministic tests for behavior changes. Do not commit generated `dist` output.

Run the complete validation gate and demo build:

```bash
npm run check
npm run build:demo
```

Pull requests should explain the behavior changed, the tests added, and any compatibility or bundle-size impact.
