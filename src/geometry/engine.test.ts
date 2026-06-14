import { describe, it, expect } from 'vitest';
import { generateSerpentineLayout } from './engine';
import { defaultLayoutParams } from '../types';
import {
  isSegmentOrthogonal,
  isSegmentInsidePart,
  isHorizontalReturnOutsideFoV,
  validateSpacingBetweenVerticalRuns
} from './validation';

describe('Geometry Engine', () => {
  it('should generate valid orthogonal segments that stay inside the part and returns stay outside FoV', () => {
    const params = {
      ...defaultLayoutParams,
      p1: { x: 5, y: 5 },
      p2: { x: 95, y: 65 }
    };

    const result = generateSerpentineLayout(params);
    expect(result.validationErrors).toHaveLength(0);
    expect(result.circuits).toHaveLength(1);

    const circuit = result.circuits[0];
    let totalCalculatedLen = 0;

    for (const segment of circuit.segments) {
      // 1. All segments are orthogonal
      expect(isSegmentOrthogonal(segment)).toBe(true);

      // 2. All segments stay inside the part boundary
      expect(isSegmentInsidePart(segment, params)).toBe(true);

      // 3. Horizontal returns must not be inside FoV
      if (Math.abs(segment.y1 - segment.y2) < 1e-6) {
        // Horizontal segment
        expect(isHorizontalReturnOutsideFoV(segment, params)).toBe(true);
      }

      const dx = segment.x1 - segment.x2;
      const dy = segment.y1 - segment.y2;
      totalCalculatedLen += Math.sqrt(dx*dx + dy*dy);
    }

    // Total length check
    expect(Math.abs(result.totalLengthMm - totalCalculatedLen)).toBeLessThan(1e-4);
  });

  it('should validate vertical run spacing within tolerance', () => {
    const params = {
      ...defaultLayoutParams,
      numCircuits: 3,
      verticalSpacing: 5,
      fovY: 40,
      fovHeight: 30,
      partHeight: 120, // ensure enough room
      p1: { x: 5, y: 5 },
      p2: { x: 95, y: 65 }
    };

    const result = generateSerpentineLayout(params);
    expect(result.validationErrors).toHaveLength(0);
    expect(validateSpacingBetweenVerticalRuns(result.circuits, params.verticalSpacing)).toBe(true);
  });

  it('should generate an error if missing P1 or P2', () => {
    const params = { ...defaultLayoutParams, p1: null, p2: { x: 10, y: 10 } };
    const result = generateSerpentineLayout(params);
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.circuits).toHaveLength(0);
  });

  it('should generate an error if P1 or P2 are inside the FoV by default', () => {
    const params = {
      ...defaultLayoutParams,
      p1: { x: 30, y: 30 }, // Inside default FoV (20,15 to 80,55)
      p2: { x: 95, y: 65 }
    };
    const result = generateSerpentineLayout(params);
    expect(result.validationErrors).toContain("P1 and P2 cannot be inside the FoV unless overridden.");
  });

  it('should generate an error if P1 or P2 are outside the part boundary', () => {
    const params = {
      ...defaultLayoutParams,
      p1: { x: -10, y: 10 },
      p2: { x: 95, y: 65 }
    };
    const result = generateSerpentineLayout(params);
    expect(result.validationErrors).toContain("P1 and P2 must be inside the part boundary.");
  });

  it('should generate an error if part height is too small for top/bottom clearances', () => {
    const params = {
      ...defaultLayoutParams,
      partHeight: 40,
      fovY: 15,
      fovHeight: 25, // FoV occupies 15 to 40. Top band = 0..15. Bottom band = 40..40 (0 size).
      wallClearance: 5,
      fovReturnClearance: 5,
      numCircuits: 5,
      p1: { x: 5, y: 5 },
      p2: { x: 95, y: 35 }
    };
    const result = generateSerpentineLayout(params);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });
});
