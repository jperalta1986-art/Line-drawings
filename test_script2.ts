import { generateSerpentineLayout } from './src/geometry/engine';
import { defaultLayoutParams } from './src/types';
import { validateSpacingBetweenVerticalRuns } from './src/geometry/validation';

const params = {
  ...defaultLayoutParams,
  numCircuits: 3,
  verticalSpacing: 5,
  fovY: 20,
  fovHeight: 30,
  p1: { x: 5, y: 5 },
  p2: { x: 95, y: 65 }
};

const result = generateSerpentineLayout(params);
console.log(result.validationErrors);
const valid = validateSpacingBetweenVerticalRuns(result.circuits, params.verticalSpacing);
console.log(valid);
const xCoords = new Set<number>();

  for (const circuit of result.circuits) {
    for (const seg of circuit.segments) {
      if (Math.abs(seg.x1 - seg.x2) < 1e-6) {
        // Vertical
        // Round to 3 decimal places to avoid floating point issues
        xCoords.add(Math.round(seg.x1 * 1000) / 1000);
      }
    }
  }

const sortedX = Array.from(xCoords).sort((a, b) => a - b);
console.log(sortedX);
