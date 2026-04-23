# Contour Architecture v0

## The Pipeline

Contour v0 uses a multi-stage pipeline designed for both persistent artifacts and conversational delivery.

1. **Scene Generation**: A JSON `scene` model authored by the assistant. Manual `x` and `y` coordinates are no longer required.
2. **Auto-Layout (ELK)**: A Node.js renderer (`scripts/render-scene.js`) uses `elkjs` (Eclipse Layout Kernel) to automatically calculate node positioning, group boundaries, and edge routing.
3. **Canonical Artifact**: The renderer outputs a lightweight, standalone `.svg` file saved in the workspace.
4. **Rasterization**: `rsvg-convert` renders the SVG into a Telegram-safe PNG.
5. **Conversational Delivery**: The PNG is shared in chat using `MEDIA:/absolute/path` for immediate visual feedback.

## Why this shape?

- **JSON + ELK** separates meaning (the model) from geometry (the layout), allowing the assistant to focus purely on conceptual relationships without guessing pixel coordinates.
- **SVG** is the correct medium for generation, editing, and applying custom visual grammars (like brush strokes and rounded splines).
- **PNG via media delivery** is the necessary bridge to make the visual conversational on surfaces like Telegram.

A co-thinking visual engine is incomplete unless its artifacts can re-enter the live conversation fluidly enough to shape the next turn. Delivery integration is a first-class concern.

## Dependencies

- **`elkjs`**: Handles the heavy lifting of graph layout, hierarchical clustering, and edge routing.
- **`rsvg-convert`** (`librsvg2-bin`): Preferred lightweight rasterizer for SVG-to-PNG export. ImageMagick `convert` is explicitly avoided due to poor SVG text/font handling.
