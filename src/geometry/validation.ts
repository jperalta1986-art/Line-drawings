import type { Circuit, LayoutParams, Point, Segment } from '../types';

export function isPointInsidePart(point: Point, params: LayoutParams): boolean {
  return point.x >= 0 && point.x <= params.partWidth &&
         point.y >= 0 && point.y <= params.partHeight;
}

export function isPointInsideFoV(point: Point, params: LayoutParams): boolean {
  return point.x > params.fovX && point.x < params.fovX + params.fovWidth &&
         point.y > params.fovY && point.y < params.fovY + params.fovHeight;
}

export function isSegmentOrthogonal(segment: Segment): boolean {
  const dx = Math.abs(segment.x1 - segment.x2);
  const dy = Math.abs(segment.y1 - segment.y2);
  return (dx < 1e-6 && dy > 0) || (dy < 1e-6 && dx > 0);
}

export function isSegmentInsidePart(segment: Segment, params: LayoutParams): boolean {
  return isPointInsidePart({ x: segment.x1, y: segment.y1 }, params) &&
         isPointInsidePart({ x: segment.x2, y: segment.y2 }, params);
}

export function isHorizontalReturnOutsideFoV(segment: Segment, params: LayoutParams): boolean {
  // If it's vertical, it can be inside FoV
  if (Math.abs(segment.x1 - segment.x2) < 1e-6) return true;

  // It's horizontal. Y is constant.
  const y = segment.y1;
  // Strictly outside means y <= fovY OR y >= fovY + fovHeight
  // But rule says "never draw a horizontal return exactly on y = FoV top or y = FoV bottom"
  // So strictly < or >.
  return y < params.fovY || y > params.fovY + params.fovHeight;
}

export function calculatePolylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i].x - points[i+1].x;
    const dy = points[i].y - points[i+1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export function validateSpacingBetweenVerticalRuns(circuits: Circuit[], expectedSpacing: number): boolean {
  // Collect all vertical segments' X coordinates
  const xCoords = new Set<number>();

  for (const circuit of circuits) {
    for (const seg of circuit.segments) {
      if (seg.type === 'vertical') {
        // Vertical
        // Round to 3 decimal places to avoid floating point issues
        xCoords.add(Math.round(seg.x1 * 1000) / 1000);
      }
    }
  }

  if (xCoords.size < 2) return true;

  const sortedX = Array.from(xCoords).sort((a, b) => a - b);
  for (let i = 0; i < sortedX.length - 1; i++) {
    const diff = sortedX[i+1] - sortedX[i];
    // Allow small tolerance
    if (Math.abs(diff - expectedSpacing) > 1e-2) {
      return false;
    }
  }

  return true;
}

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
