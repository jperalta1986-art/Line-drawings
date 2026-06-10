import { generateSerpentineLayout } from './src/geometry/engine.ts';
import { defaultLayoutParams } from './src/types.ts';

const params = {
  ...defaultLayoutParams,
  numCircuits: 2,
  p1: { x: 5, y: 10 },
  p2: { x: 5, y: 60 },
  partHeight: 120,
  fovY: 30,
  fovHeight: 60,
  allowPointsInsideFov: false
};

const result = generateSerpentineLayout(params);

console.log("Validation Errors:", result.validationErrors);
for (const c of result.circuits) {
  console.log(`Circuit ${c.id} points:`);
  console.log(c.points);
}
