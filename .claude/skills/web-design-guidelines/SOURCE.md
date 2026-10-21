# Source

Vendored from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines)
at commit `063bee94c3f4df8453406c830b0a7df0f2860278` (2026-08-28). Author: Vercel. License: MIT (declared in the upstream README
and skill metadata; the upstream repository has no separate LICENSE file).

Reviewed before adding: instructions only, no scripts, no network calls, no credential handling.
To update, re-copy the folder from upstream and review the diff before committing.

## Local change

Upstream tells the agent to fetch its rules from
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` on every
run. Instructions fetched at run time can change without review, so this copy pins a reviewed
snapshot in `guidelines.md` (from
[vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines)
at commit `434b7f91364665f2f733b310ec54809bf8f37937`, MIT, Copyright (c) 2025 Vercel Labs).
SKILL.md was edited to read that file instead.
