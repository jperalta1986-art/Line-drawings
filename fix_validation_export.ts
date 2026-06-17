import * as fs from 'fs';
let code = fs.readFileSync('src/geometry/validation.ts', 'utf8');

if (!code.includes('checkSegmentsIntersect')) {
  // Wait, I appended checkSegmentsIntersect in a previous step! Why is it missing?
  // Ah, I wrote to it but maybe I overwrote it.
  code += `
export function checkSegmentsIntersect(s1: Segment, s2: Segment, checkAdjacent: boolean): boolean {
  const isHorizontal1 = Math.abs(s1.y1 - s1.y2) < 1e-6;
  const isHorizontal2 = Math.abs(s2.y1 - s2.y2) < 1e-6;

  const minX1 = Math.min(s1.x1, s1.x2);
  const maxX1 = Math.max(s1.x1, s1.x2);
  const minY1 = Math.min(s1.y1, s1.y2);
  const maxY1 = Math.max(s1.y1, s1.y2);

  const minX2 = Math.min(s2.x1, s2.x2);
  const maxX2 = Math.max(s2.x1, s2.x2);
  const minY2 = Math.min(s2.y1, s2.y2);
  const maxY2 = Math.max(s2.y1, s2.y2);

  if (isHorizontal1 && isHorizontal2) {
    if (Math.abs(s1.y1 - s2.y1) > 1e-6) return false;
    return maxX1 >= minX2 - 1e-6 && minX1 <= maxX2 + 1e-6;
  } else if (!isHorizontal1 && !isHorizontal2) {
    if (Math.abs(s1.x1 - s2.x1) > 1e-6) return false;
    return maxY1 >= minY2 - 1e-6 && minY1 <= maxY2 + 1e-6;
  } else {
    const hSeg = isHorizontal1 ? { minX: minX1, maxX: maxX1, y: s1.y1 } : { minX: minX2, maxX: maxX2, y: s2.y1 };
    const vSeg = isHorizontal1 ? { minY: minY2, maxY: maxY2, x: s2.x1 } : { minY: minY1, maxY: maxY1, x: s1.x1 };

    if (hSeg.y >= vSeg.minY - 1e-6 && hSeg.y <= vSeg.maxY + 1e-6 &&
        vSeg.x >= hSeg.minX - 1e-6 && vSeg.x <= hSeg.maxX + 1e-6) {
      if (!checkAdjacent) {
        const hTouchesEnd = (Math.abs(vSeg.x - hSeg.minX) < 1e-6 || Math.abs(vSeg.x - hSeg.maxX) < 1e-6);
        const vTouchesEnd = (Math.abs(hSeg.y - vSeg.minY) < 1e-6 || Math.abs(hSeg.y - vSeg.maxY) < 1e-6);
        if (hTouchesEnd && vTouchesEnd) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
}
`;
  fs.writeFileSync('src/geometry/validation.ts', code);
}
