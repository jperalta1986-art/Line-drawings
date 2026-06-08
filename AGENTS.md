# AGENTS.md

## Project purpose
This repository contains a browser-based engineering layout tool for generating orthogonal serpentine wire circuits inside a rectangular part and around a FoV area.

## Key rules
- Geometry correctness is more important than UI decoration.
- All wire paths must be orthogonal: only horizontal and vertical segments.
- Use millimeters as the internal unit.
- Horizontal serpentine return segments must stay outside the FoV and inside the part.
- Vertical wire runs may cross the FoV.
- P1 and P2 are user-selected terminal points and must reside within the part boundary.
- The total wire length must be calculated from actual generated segment coordinates.

## Code organization
- Keep geometry generation (`src/geometry/engine.ts`) independent from SVG rendering (`src/components/PlotArea.tsx`).
- Unit tests (`src/geometry/engine.test.ts`) are essential for verifying constraint logic.
- Prefer TypeScript types for all geometry objects (`src/types.ts`).

## Commands
- Install: `npm install`
- Development: `npm run dev`
- Tests: `npm run test` or `npx vitest run`

## Agent Guidelines
- Any UI component utilizing SVG should use standard DOM event handling for dragging (`onPointerDown`, `onPointerMove`, `onPointerUp`) rather than adding heavy external drag-and-drop libraries.
- React state should manage layout parameters, triggering geometry re-generation dynamically upon updates.
- If modifying point validation rules, ensure the UI visually communicates these bounds or displays alerts to the user.
