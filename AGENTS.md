# AGENTS.md

## Project purpose
This repository contains a browser-based engineering layout tool for generating orthogonal serpentine wire circuits inside a rectangular part and around a FoV area.

## Key rules
- Geometry correctness is more important than UI decoration.
- All wire paths must be orthogonal: only horizontal and vertical segments.
- Use millimeters as the internal unit.
- Horizontal serpentine return segments must stay outside the FoV and inside the part.
- Vertical wire runs may cross the FoV.
- P1 and P2 are user-selected terminal points.
- The total wire length must be calculated from actual generated segment coordinates.

## Code organization
- Keep geometry generation independent from SVG rendering.
- Add unit tests for geometry logic.
- Prefer TypeScript types for all geometry objects.
- Avoid hard-coded demo-only behavior.

## Commands
- Install: npm install
- Development: npm run dev
- Tests: npm test