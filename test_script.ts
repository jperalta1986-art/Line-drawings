import { generateSerpentineLayout } from './src/geometry/engine';
import { defaultLayoutParams } from './src/types';

const params = {
  ...defaultLayoutParams,
  numCircuits: 3,
  verticalSpacing: 5,
  p1: { x: 5, y: 5 },
  p2: { x: 95, y: 65 }
};

const result = generateSerpentineLayout(params);
console.log(result.validationErrors);
