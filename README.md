# Engineering Layout Tool

This is a browser-based engineering layout tool for generating orthogonal serpentine wire circuits inside a rectangular part and around a Field of View (FoV) area.

## Features
- Interactive SVG plotting to define part dimensions, FoV area, and terminal points.
- Constraint-based layout generating purely orthogonal wire paths.
- Interactive dragging of terminal points to regenerate layout in real time.
- Configurable multiple independent parallel circuits.
- Precise metric calculation (mm) of circuit lengths.
- Export as SVG and JSON.

## Setup

Ensure you have Node.js installed.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Run the tests:**
   ```bash
   npm test
   ```

## Usage
1. Modify parameters in the left sidebar to define the geometry constraints.
2. Click **Select P1** and click inside the black part boundary to set the start point.
3. Click **Select P2** and click inside the black part boundary to set the end point.
4. Click **Generate Circuit** to calculate the layout.
5. If you drag P1 or P2, the circuit will regenerate instantly, as long as it satisfies the constraints.
