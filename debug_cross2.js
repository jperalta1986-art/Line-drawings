import { generateSerpentineLayout } from './src/geometry/engine.ts';
import { defaultLayoutParams } from './src/types.ts';
import { checkSegmentsIntersect } from './src/geometry/validation.ts';

const params = {
  ...defaultLayoutParams,
  p1: { x: 5, y: 5 },
  p2: { x: 195, y: 190 }
};

const result = generateSerpentineLayout(params);
console.log(result.validationErrors);

const c1 = result.circuits[0];
const c2 = result.circuits[1];
const c3 = result.circuits[2];

console.log("C1 segments 21 and 22:", c1.segments[21], c1.segments[22]);
console.log("C2 segments 18 and 19:", c2.segments[18], c2.segments[19]);
