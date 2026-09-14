# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [3.0.0] - Unreleased

### Changed

- Migrated from `@modelcontextprotocol/sdk` (v1) to the **MCP TypeScript SDK v2**
  (`@modelcontextprotocol/server` / `@modelcontextprotocol/client` /
  `@modelcontextprotocol/node`, all `2.0.0`), which targets the 2026-07-28 MCP
  spec. Import paths changed throughout `src/`; the HTTP transport was rewritten
  on top of `NodeStreamableHTTPServerTransport`, and now validates both the
  `Origin` and `Host` headers (via `@modelcontextprotocol/node`'s
  `originValidation`/`hostHeaderValidation` helpers) instead of a hand-rolled
  Origin check. All tool `inputSchema`s were migrated from the deprecated
  raw-shape form (`{ field: z.string() }`) to `z.object({ ... })`.
- Upgraded `mssql` to `^12.7.2`, `zod` to `^4.6.5`, `typescript` to `^5.9.3`, and
  `@types/node` to `^22.0.0`.
- Raised the minimum supported Node.js version to `>=20.0.0` (Node 18 is end of
  life); CI now tests against Node 20.x, 22.x, and 24.x instead of 18.x/20.x/22.x.
- Migrated `z.record()` calls to zod v4's two-argument form
  (`z.record(z.string(), valueSchema)`).

### Fixed

- Deduplicated the deprecated alias tools (`mssql_get_schema`,
  `mssql_describe_table`, `mssql_get_table_data`, `mssql_execute_procedure`) so
  they share the same query-building/execution logic as their primary tools
  instead of re-implementing it — reduces the risk of a fix landing in one but
  not the other.
- Corrected the README's deprecated-alias table, which previously listed several
  bare tool names (e.g. `connect_database`, `execute_query`) that were never
  actually registered by the server. It now lists only the 5 aliases that exist
  in code.

### Removed

- Removed `src/schemas/outputs.ts`, an unused Zod output-schema module left over
  from a prior fix that dropped `outputSchema` from tool registrations.

### Added

- `.env.example` documenting every environment variable read by `src/config.ts`.
- CI integration tests that exercise a full connect → query → list → disconnect
  flow against a real SQL Server instance running as a GitHub Actions service
  container.

## [2.3.6] - 2026-08-13

- Dropped `outputSchema` from tool registrations to restore Claude Code
  compatibility.

## [2.3.4] - 2026-06-08

- Fixed README version drift; excluded test output from the published npm
  package.

## [2.3.3] - 2026-06-08

- Upgraded `mssql` to v12; switched to `NodeNext` module resolution; expanded
  the unit test suite.

## [2.3.2] - 2026-04-01

- Restored correct datetime formatting after a regression.

## [2.3.1] - 2026-04-01

- Enhanced markdown output formatting; added UTC-aware handling for
  `datetimeoffset` values.

## [2.3.0] - 2026-03-27

- Exported `SAFE_IDENTIFIER_RE`; added Zod output schemas for tool responses
  (later removed in 2.3.6, see above).

## [2.2.0] - 2026-03-26

- Modernized the project into a modular `src/` architecture (`db/`, `tools/`,
  `resources/`, `transports/`, `utils/`).
- Applied `mcp-builder` conventions: `mssql_`-prefixed tool names,
  `response_format` parameter on data tools.
- Upgraded `@modelcontextprotocol/sdk` to `1.28.0`.
- Fixed stdio transport shutdown on stdin EOF/close, since Windows does not
  reliably deliver OS signals to child processes.

## [2.0.x] - 2025-10 – 2025-12

- Initial public MCP server implementation for MS SQL Server.
- Added `DB_ENCRYPT` for Azure SQL compatibility.

## [Unreleased history note]

Versions prior to 2.2.0 were not tracked in a changelog; the summary above is
reconstructed from git history.
