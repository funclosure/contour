# Contour SVG Validation Spec v0

## Purpose

Contour should not rely on visual generation alone.
For minimum communication artifacts, geometric mistakes such as overlaps, intrusions, and clipped elements should be caught before sharing.

This spec defines the first validation layer for SVG artifacts.
It is not a substitute for human design review. It is a guardrail for obvious layout failures.

## Principle

Use a two-stage quality check:

1. **programmatic geometry validation**
2. **human compositional review**

Programmatic validation should catch structural mistakes.
Human review should judge readability, rhythm, hierarchy, and overall grace.

## Validation targets

The validator should inspect the final rendered geometry of at least these object classes:
- node bodies
- node text blocks
- edge label pills
- annotation boxes
- annotation text blocks
- canvas bounds

If possible, the validator should operate from the renderer's own layout data before SVG export.
If not, it may parse the emitted SVG directly.

## v0 failure classes

### 1. Node overlap
Two node bodies must not intersect.

Rule:
- Fail if node body bounding boxes overlap.
- Warn if node body spacing is below a minimum margin threshold.

Suggested threshold:
- minimum horizontal or vertical clearance: `12px`

### 2. Label intruding into foreign node
An edge label pill must not intersect a node body other than its own explicitly allowed target zone.

Rule:
- Fail if an edge label bounding box overlaps any node body bounding box.

This is especially important for concise SVG artifacts, where label pills should not sit on top of nodes unless the language intentionally allows that pattern.

### 3. Label-label collision
Two edge labels should not collide.

Rule:
- Fail if two edge label bounding boxes overlap.
- Warn if spacing between them falls below a minimum threshold.

Suggested threshold:
- label-to-label clearance: `8px`

### 4. Annotation intrusion
Annotations must not collide with node bodies, edge-label pills, or other annotations.

Rule:
- Fail if annotation box overlaps node body, edge label, or another annotation.

### 5. Text overflow from container
Node text should not escape its node body.

Rule:
- Fail if name or summary text block exceeds the node's inner safe bounds.
- Warn if text comes within `4px` of any node edge.

This can be estimated with text bounding boxes after layout.

### 6. Out-of-bounds placement
Important elements must remain inside the viewBox with adequate margin.

Rule:
- Fail if any node, label pill, or annotation box extends beyond the viewBox.
- Warn if any element is closer than `10px` to the viewBox edge.

### 7. Forbidden-zone violations
Some artifacts may define regions where certain labels should never appear.

Example:
- top-row process labels should not sit inside node bodies
- annotations should stay in margin zones

Rule:
- support optional forbidden zones in the scene or render config
- fail if a checked element enters one of those zones

## v0 review heuristics (human)

Even after passing geometry validation, a human should still ask:
- does the artifact read in one pass?
- is the eye path obvious?
- do any labels feel too close even if not technically overlapping?
- does the artifact feel calm, or mechanically crowded?
- is topology doing enough work, or are labels compensating for weak composition?

These are not yet programmatic checks.
They remain part of the inspect-before-sharing rule.

## Suggested validator output

The validator should report results like:

```text
FAIL label-node-overlap edgeLabel:grounds intersects node:ground
WARN node-spacing node:oppose and node:refine clearance 7px < 12px
FAIL annotation-overlap annotation:note-1 intersects edgeLabel:renews
PASS bounds-check all primary elements within viewBox
```

This should be easy to read and actionable.

## Future extensions

Possible future checks:
- edge crossing density
- label path occlusion
- visual center imbalance
- text hierarchy consistency
- semantic checks tied to artifact type

## Summary

Contour v0 should adopt this baseline rule:

> No minimum communication artifact should be shared until it passes geometry validation and then receives a human visual check.

That makes "inspect before sharing" an actual process, not just a good intention.
