import { generateSerpentineLayout } from './src/geometry/engine.ts';
import { defaultLayoutParams } from './src/types.ts';

const params = {
  ...defaultLayoutParams,
  p1: { x: 5, y: 5 },
  p2: { x: 195, y: 190 }
};

const result = generateSerpentineLayout(params);
console.log(result.validationErrors);
