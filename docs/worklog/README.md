# Delivery worklog

This directory is the chronological, non-sensitive delivery record for Pokyh
Learn. It gives a future maintainer enough context to understand what changed,
why it changed, what was verified, and whether it was released—without relying
on a chat transcript.

## Required protocol

Create one file per delivery or coherent implementation run using
`YYYY-MM-DD-short-topic.md`. Update it before and after every meaningful:

- product, security, data-model, API, deployment, design, or legal-text
  decision;
- implementation batch or dependency change;
- static check, test, container check, browser/visual check, PR inspection,
  review finding, commit, and push; and
- blocked item, rollback, or release decision.

Each entry must state the timestamp, intent, outcome, affected areas,
verification, and remaining risk or next step. Summaries are intentionally
concise: do not record private reasoning, credentials, tokens, passwords,
personal data, raw learning content, production request payloads, or copied
third-party material.

## Template

```md
## YYYY-MM-DD HH:MM TZ — short action

- Intent:
- Outcome:
- Affected areas:
- Verification:
- Risk / next step:
- Release state: uncommitted | committed `<sha>` | pushed `<remote>/<branch>`
```

Logs describe facts, not promises. If a check could not run, say why and leave
the release state uncommitted.
