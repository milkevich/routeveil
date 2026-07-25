Agent Instructions

General Rules

Follow the task-specific instructions provided in the current chat. Do not carry previous tasks or unrelated issues into the current implementation.

Inspect the relevant implementation before making changes.

Keep every change focused on the requested task. Do not refactor, rename, reorganize, or modify unrelated code.

Preserve existing behavior and public APIs unless the task explicitly requires changing them.

Do not add source-code comments unless explicitly requested.

Do not change styles, spacing, layout, visual design, animation appearance, or other visual behavior unless explicitly requested.

Do not commit, push, pull, fetch, merge, rebase, reset, checkout, switch branches, create branches, create tags, or perform any other Git operation unless explicitly requested.

Do not bump package versions, create releases, publish to npm, run npm publish, or attempt any npm release operation unless explicitly requested.

Add or update focused tests when behavior changes.

After implementation, run the relevant tests and always run npm run build.

Verify the implementation works correctly before finalizing.

Do not claim success when tests or the build fail. Clearly report remaining failures and whether they are related to the requested change.

Preserve the project's existing code style and architecture. Prefer extending existing patterns over introducing new abstractions unless explicitly requested.