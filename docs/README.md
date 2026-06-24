# Documentation

## Architecture Decision Records (ADR)

We use [Architecture Decision Records](https://adr.github.io/) to capture important architectural decisions, their context, and their consequences.

ADRs live in [`adr/`](./adr) and follow the [MADR (Markdown Any Decision Records)](https://adr.github.io/madr/) format. We chose MADR over the lighter Michael Nygard format because it explicitly captures the considered options and their pros and cons, which makes the rationale behind a decision easier to follow and review.

Each record is numbered and is immutable once accepted: a decision that no longer holds is superseded by a new ADR rather than edited.

### Status legend

- `draft`: still being written, not yet ready for review (editable).
- `proposed`: content is ready, awaiting team agreement (editable).
- `accepted`: agreed and in effect (immutable).
- `rejected`: considered but not adopted (immutable).
- `deprecated`: no longer relevant, with no direct replacement (immutable).
- `superseded by ADR-XXXX`: replaced by a newer decision (immutable).

### Records

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./adr/0001-plugin-support.md) | Plugin support for BpmnVisualization | Draft |
