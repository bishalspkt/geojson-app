# geojson.app documentation

| Doc | Read it when… |
|---|---|
| [architecture.md](architecture.md) | you're touching `core/`, `state/`, or wondering why the code is layered the way it is. Contains the **invariants** — read those before any structural change. |
| [extending.md](extending.md) | you're adding a panel, context-menu action, data format, tool, or SDK command. Recipe-style, with the registry APIs. |
| [developers-api.md](developers-api.md) | you're embedding geojson.app or writing against the SDK/postMessage protocol. The complete public API reference + stability guarantees. |
| [embed.md](embed.md) | you want the shorter embed quick-start version of the above. |
| [integrations.md](integrations.md) | you're working on how external callers (SDK, URL params, MCP agents) drive the map — one command surface, many transports. |
| [styling.md](styling.md) | you're changing feature styling (simplestyle), themes, the default palette, or SDK paint overrides. |
| [deployment.md](deployment.md) | you're deploying the app or tile worker, rotating the tile archive, or debugging a third-party runtime dependency. |
| [roadmap.md](roadmap.md) | you're deciding what to build next, or checking whether an idea is already planned (or a non-goal). |

Contributor workflow (setup, conventions, verification): [../CONTRIBUTING.md](../CONTRIBUTING.md). Claude Code guidance: [../CLAUDE.md](../CLAUDE.md) plus the repo skills in [`.claude/skills/`](../.claude/skills/).
