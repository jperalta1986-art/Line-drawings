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
