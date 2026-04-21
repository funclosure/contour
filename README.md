# Contour

*A co-thinking visual engine for graspable inquiry*

## What is this?

Contour is an early prototype for a co-thinking visual engine.

Its purpose is to help human and assistant move beyond flat chat by turning parts of a discussion into revisable visual artifacts that improve grasp, orientation, and the next move in inquiry.

Contour is a child project under the broader `grasp-tools` philosophy.

## Why it exists

Text chat is already a useful cognitive scaffold, but it weakly supports:
- spatial overview
- visible topology
- persistent relations
- contours of an inquiry
- gradual revelation of structure

Contour begins from a simple question:

> What is the smallest visual engine that can participate directly in a co-thinking loop?

## v0 scope

Version 0 is intentionally narrow.

Contour v0 should:
1. take a small structured representation of a thought
2. render it into a simple visual artifact
3. allow revision through file editing
4. produce outputs that can be shared in chat

### v0 is not yet
- a full inquiry terrain
- a fog-of-war knowledge map
- a GUI editor
- a complete product
- a general-purpose diagramming tool

## Working loop

The intended minimal loop is:

1. conversation produces a distinction, relation, tension, or cluster
2. that structure is expressed in a small editable representation
3. Contour renders it as a visual artifact
4. the human reacts to the visual
5. the representation is revised
6. the revised artifact improves the next turn of conversation

If the visual does not improve the next conversational move, it is not yet doing its job.

## Current representational stance

The current working stance is hybrid:
- structured internal state
- expressive rendered surface
- chat-safe delivery

A likely early stack is:
- structured scene model
- HTML as editable carrier
- SVG as visual grammar
- PNG as optional export for chat delivery

## Early success criteria

Contour v0 succeeds if it can:
- make thought more spatially graspable
- remain easy to revise
- avoid unnecessary visual clutter
- preserve useful ambiguity where needed
- help surface structure that plain chat alone does not make obvious
- stay communicable in the medium actually being used

## Relationship to Grasp Tools

`grasp-tools` is the philosophical and design-research home.
`contour` is one concrete instrument built under that umbrella.

If `grasp-tools` asks how to extend mind without outsourcing grasp, `contour` explores one answer: a visual substrate for iterative co-thinking.
