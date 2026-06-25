# Architecture and Context for Development

## 1. Project Objective and Scope
This project is a static, browser-based engineering layout tool designed to generate orthogonal serpentine wire circuits inside a rectangular part boundary while navigating around a Field of View (FoV) area.

The primary objective is **geometric correctness over visual beauty**. The tool produces precise, deterministically calculated paths suitable for engineering exports rather than aesthetic rendering. The end-user is typically non-technical, prioritizing a reliable, ready-to-use deployed application without requiring local setup or technical resolution.

## 2. Technical Stack
- **Framework**: React + TypeScript + Vite.
- **Rendering**: SVG is strictly used for precise geometry rendering. (Canvas or vague approximations are explicitly avoided).
- **Exporting**:
  - **DXF**: Utilizes the `dxf-writer` npm package.
  - **SVG**: Utilizes native browser XML serialization.
- **Languages**: TypeScript is preferred for all geometry objects and logic. (No Python or matplotlib).

## 3. Core Architectural Principles
A fundamental principle of the architecture is the **strict separation of geometry logic and UI rendering**.

- **Geometry Engine (`src/geometry/engine.ts`)**:
  - Responsible for all constraints, mathematics, and path generation.
  - Entirely independent of the DOM or React components.
  - Takes a deterministic set of `LayoutParams` and returns calculated circuits, total lengths, and validation errors.
- **UI & State (`src/components/`)**:
  - React state holds the parameters (e.g., width, clearances, start/end points).
  - Updates to parameters trigger a re-calculation in the geometry engine.
  - `PlotArea.tsx` renders the calculated paths using SVG. Interactive elements (like dragging terminal points P1 and P2) are implemented using standard DOM pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) instead of heavy drag-and-drop libraries.

## 4. Geometry and Routing Rules
All geometries are calculated internally using **millimeters (mm)**.

### Routing Constraints:
- **Orthogonal Paths**: All generated wire paths must consist of purely horizontal and vertical segments.
- **FoV Interaction**:
  - Horizontal serpentine return segments must stay strictly outside the FoV area and inside the part boundary.
  - Vertical wire runs are permitted to cross the FoV.
- **Circuit Generation Algorithm**:
  - Employs **concentric nesting protocols**, dynamic space planning, and look-ahead routing to prevent overlap when generating multiple parallel circuits.
  - The outermost circuit acts as a boundary envelope encapsulating all inner paths.
  - Return paths are assigned explicit, non-overlapping perimeter channels.
- **Terminal Points (P1 and P2)**: Must reside within the part boundary and (unless explicitly overridden) outside the FoV. The total wire length is precisely calculated from the actual generated segment coordinates.

## 5. Build, Test, and Deployment
- **Commands**:
  - `npm ci` / `npm install`: Install dependencies.
  - `npm run dev`: Start local development server.
  - `npm test`: Run Vitest test suite for geometry and validation logic.
  - `npm run lint`: Run ESLint checks.
  - `npm run build`: Compile TypeScript and build for production via Vite.
- **Continuous Deployment (CD)**:
  - The application is automatically deployed to **GitHub Pages** via a GitHub Actions workflow (`.github/workflows/deploy.yml` or `static.yml`) triggered on pushes to the `main` branch.
  - The project builds into a `./dist` directory, utilizing a relative base (`base: './'`) in the Vite configuration to ensure paths resolve correctly in the GitHub Pages environment.
