import * as fs from 'fs';

let text = fs.readFileSync('src/geometry/engine.ts', 'utf8');

// I will now fix checkCrossCircuitCollision to completely ignore intersections inside checkSegmentsIntersect
// if the segments only touch at P1 or P2.
// In checkSegmentsIntersect, I can just not return true if the intersection is exactly at P1 or P2.
// But checkSegmentsIntersect doesn't know P1/P2.
// So I will pass them in.

text = text.replace(/export function checkCrossCircuitCollision\(circuits: Circuit\[\], minDistance: number\): string \| null \{/g,
`export function checkCrossCircuitCollision(circuits: Circuit[], minDistance: number, params?: LayoutParams): string | null {`);

let valText = fs.readFileSync('src/geometry/validation.ts', 'utf8');

// Just remove all my previous manual modifications in validation.ts to do it cleanly.
