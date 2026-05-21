# Context Index

## Purpose

`docs/context/` holds the short, mandatory context AI agents should read before making non-trivial changes.

This directory is intentionally small. It exists because important project rules hidden under `docs/references/` are easy for AI agents to miss.

## Read These First

1. `project-context.md`
2. `source-of-truth-and-precedence.md`
3. `conventions.md`

## What Belongs Here

- current project context that should orient every AI session
- source-of-truth and owner-doc precedence rules
- project-wide conventions that are not merely optional lookup material

## What Does Not Belong Here

- long design documents
- one-off analysis
- daily logs
- execution plans
- detailed reference tables

Put those in their owning directories and link to them from context only when needed.
