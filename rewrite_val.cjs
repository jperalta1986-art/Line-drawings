const fs = require('fs');
let code = fs.readFileSync('src/geometry/validation.ts', 'utf8');

// If we haven't added the new functions, add them.
if (!code.includes('checkSegmentsIntersect')) {
  code += `
export function checkSegmentsIntersect(s1: Segment, s2: Segment, checkAdjacent: boolean, p1?: Point, p2?: Point): boolean {
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

  // Check if they only touch at exactly P1 or P2
  const checkEndpointTouch = (pt: Point) => {
    if (!pt) return false;
    const s1Touches = (Math.abs(s1.x1 - pt.x) < 1e-6 && Math.abs(s1.y1 - pt.y) < 1e-6) ||
                      (Math.abs(s1.x2 - pt.x) < 1e-6 && Math.abs(s1.y2 - pt.y) < 1e-6);
    const s2Touches = (Math.abs(s2.x1 - pt.x) < 1e-6 && Math.abs(s2.y1 - pt.y) < 1e-6) ||
                      (Math.abs(s2.x2 - pt.x) < 1e-6 && Math.abs(s2.y2 - pt.y) < 1e-6);
    return s1Touches && s2Touches;
  };

  if (p1 && checkEndpointTouch(p1)) {
    // If they touch at P1, verify they don't overlap in length.
    if (isHorizontal1 === isHorizontal2) {
      // collinear
      if (isHorizontal1) {
        if (Math.max(minX1, minX2) < Math.min(maxX1, maxX2) - 1e-6) return true; // overlap
        return false;
      } else {
        if (Math.max(minY1, minY2) < Math.min(maxY1, maxY2) - 1e-6) return true; // overlap
        return false;
      }
    }
    return false; // orthogonal touch is OK
  }

  if (p2 && checkEndpointTouch(p2)) {
    if (isHorizontal1 === isHorizontal2) {
      if (isHorizontal1) {
        if (Math.max(minX1, minX2) < Math.min(maxX1, maxX2) - 1e-6) return true;
        return false;
      } else {
        if (Math.max(minY1, minY2) < Math.min(maxY1, maxY2) - 1e-6) return true;
        return false;
      }
    }
    return false;
  }


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

export function checkSelfIntersection(circuit: Circuit): string | null {
  const segs = circuit.segments;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 2; j < segs.length; j++) {
      if (checkSegmentsIntersect(segs[i], segs[j], false)) {
        return \`Circuit \${circuit.id} self-intersects near segment \${i} and \${j}.\`;
      }
    }
  }

  for (let i = 0; i < segs.length - 1; i++) {
    const s1 = segs[i];
    const s2 = segs[i+1];
    const isHorizontal1 = Math.abs(s1.y1 - s1.y2) < 1e-6;
    const isHorizontal2 = Math.abs(s2.y1 - s2.y2) < 1e-6;
    if (isHorizontal1 === isHorizontal2) {
      return \`Circuit \${circuit.id} has overlapping adjacent segments \${i} and \${i+1}.\`;
    }
  }

  return null;
}

export function checkCrossCircuitCollision(circuits: Circuit[], minDistance: number, params?: LayoutParams): string | null {
  for (let i = 0; i < circuits.length; i++) {
    for (let j = i + 1; j < circuits.length; j++) {
      const segs1 = circuits[i].segments;
      const segs2 = circuits[j].segments;

      for (let s1Idx = 0; s1Idx < segs1.length; s1Idx++) {
        for (let s2Idx = 0; s2Idx < segs2.length; s2Idx++) {
           const s1 = segs1[s1Idx];
           const s2 = segs2[s2Idx];

           if (checkSegmentsIntersect(s1, s2, true, params?.p1 || undefined, params?.p2 || undefined)) {
             return \`Circuit \${circuits[i].id} intersects Circuit \${circuits[j].id}.\`;
           }

           const isH1 = Math.abs(s1.y1 - s1.y2) < 1e-6;
           const isH2 = Math.abs(s2.y1 - s2.y2) < 1e-6;

           if (isH1 && isH2) {
             if (Math.abs(s1.y1 - s2.y1) < minDistance - 1e-4) {
               const minX1 = Math.min(s1.x1, s1.x2), maxX1 = Math.max(s1.x1, s1.x2);
               const minX2 = Math.min(s2.x1, s2.x2), maxX2 = Math.max(s2.x1, s2.x2);
               if (maxX1 > minX2 - 1e-4 && minX1 < maxX2 + 1e-4) {
                 // Check if it's the exact P1/P2 endpoint (fan-out parallel lines)
                 // Actually they are just too close. We could allow them if they are lead-outs but it's simpler to report error.
                 // Actually wait, P1 leads fan out vertically, meaning they are horizontal lines!
                 // If they fan out at different Ys, they are separated by \`layerSpacing\`. minDistance is \`layerSpacing * 0.9\`. So they are fine!
                 return \`Circuit \${circuits[i].id} is too close to Circuit \${circuits[j].id}.\`;
               }
             }
           } else if (!isH1 && !isH2) {
             if (Math.abs(s1.x1 - s2.x1) < minDistance - 1e-4) {
               const minY1 = Math.min(s1.y1, s1.y2), maxY1 = Math.max(s1.y1, s1.y2);
               const minY2 = Math.min(s2.y1, s2.y2), maxY2 = Math.max(s2.y1, s2.y2);
               if (maxY1 > minY2 - 1e-4 && minY1 < maxY2 + 1e-4) {
                 return \`Circuit \${circuits[i].id} is too close to Circuit \${circuits[j].id}.\`;
               }
             }
           }
        }
      }
    }
  }
  return null;
}
`;
  fs.writeFileSync('src/geometry/validation.ts', code);
}
