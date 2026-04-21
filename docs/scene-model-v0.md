# Contour Scene Model v0

## Purpose

Contour v0 needs a scene model that is small, editable, and expressive enough to render the kinds of cognitive structures we have been discussing.

The purpose of the model is not to be a universal knowledge graph. It is to support a first co-thinking loop where a small thought-structure can become a revisable visual artifact.

## Design constraints

The model should be:
- easy to edit by file
- easy to reason about
- simple enough to render in HTML/SVG
- expressive enough to show distinctions, relations, tensions, and grouping
- open to future growth without premature complexity

## Core idea

A scene is a small set of cognitive objects plus layout hints.

Contour v0 should focus on showing:
- concepts or figures
- relationships between them
- grouped regions
- annotations
- optional tension links
- optional reveal state

## Proposed top-level structure

```json
{
  "title": "...",
  "subtitle": "...",
  "nodes": [],
  "edges": [],
  "groups": [],
  "annotations": [],
  "view": {}
}
```

## Object types

### nodes

Nodes are the primary visible units in the scene.
They may represent:
- a concept
- a figure
- a question
- a claim
- a project seed

Suggested shape:

```json
{
  "id": "bret",
  "label": "Bret Victor",
  "kind": "figure",
  "summary": "Humane media and representation shape thinkability.",
  "x": 120,
  "y": 160,
  "reveal": "visible"
}
```

Fields:
- `id`: unique identifier
- `label`: primary displayed text
- `kind`: e.g. `figure`, `concept`, `question`, `claim`, `project`
- `summary`: optional short explanatory line
- `x`, `y`: layout position for v0
- `reveal`: `visible`, `faded`, or `hidden`

### edges

Edges relate nodes.
They are not only logical links. They may express influence, support, refinement, tension, or bridge.

Suggested shape:

```json
{
  "from": "bret",
  "to": "humane-medium",
  "kind": "claims",
  "label": "calls for"
}
```

Fields:
- `from`, `to`: node ids
- `kind`: e.g. `claims`, `supports`, `complicates`, `bridges`, `tension`
- `label`: optional visible label

### groups

Groups create visible regions or clusters.
They help move the representation beyond isolated nodes.

Suggested shape:

```json
{
  "id": "core-triad",
  "label": "Core constellation",
  "members": ["bret", "vervaeke", "clark"],
  "style": "region"
}
```

Fields:
- `id`
- `label`
- `members`: array of node ids
- `style`: e.g. `region`, `cluster`, `lane`

### annotations

Annotations are free-standing notes that help preserve ambiguity, framing, or interpretation.

Suggested shape:

```json
{
  "id": "note-1",
  "text": "The problem is not the screen alone, but representational monoculture.",
  "x": 420,
  "y": 90,
  "kind": "insight"
}
```

Fields:
- `id`
- `text`
- `x`, `y`
- `kind`: e.g. `insight`, `question`, `warning`

### view

`view` holds optional display metadata.

Suggested shape:

```json
{
  "theme": "light",
  "showSummaries": true,
  "showEdgeLabels": true
}
```

This should remain lightweight in v0.

## Why this is enough for v0

This model supports:
- figures
- concepts
- relations
- tensions
- grouped regions
- gradual reveal state
- lightweight framing notes

That is enough to render a meaningful first co-thinking artifact without prematurely turning Contour into a full ontology engine.

## Not included yet

Deliberately excluded from v0:
- nested groups
- automatic layout
- editable UI state
- full history / revisions
- semantic inference
- rich interaction behavior
- timeline playback

These may come later if needed.

## Guiding principle

The scene model should stay small enough that the human and assistant can both grasp it directly.

If the representation becomes harder to understand than the thought it is meant to clarify, the model has failed.
