# Input Processing Guide

## Purpose

This guide explains how to handle raw source material before it becomes requirements.

## Rule

Do not ask AI to code directly from a large raw input dump when the source still mixes:

- business goals
- UI examples
- implementation guesses
- missing assumptions
- half-settled scope

## Recommended Flow

1. Store the raw material in `docs/input/`.
2. Mark the source type: PM note, card-set doc, prototype, article, or mixed source.
3. Write unresolved questions into `docs/discussions/`.
4. Write the synthesized result into `docs/requirements/`.

## Useful Source Classification

- `source-pm-*.md` - product-manager notes
- `source-prototype-*.md` - prototype interpretation
- `source-cardset-*.md` - card-set or structured requirement docs
- `source-article-*.md` - external articles or references

## Caution

Strongly structured source material is useful, but it still may not answer:

- actual scope boundary for the current iteration
- domain judgment needed for a business decision
- which interactions are core versus optional
- whether the prototype is complete enough to build from directly
