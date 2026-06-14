export interface Point {
  x: number;
  y: number;
}

export type SegmentType = 'lead-in' | 'vertical' | 'horizontal-return' | 'lead-out' | 'connection';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: SegmentType;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circuit {
  id: number;
  color: string;
  points: Point[];
  segments: Segment[];
  lengthMm: number;
}

export interface LayoutParams {
  partWidth: number;
  partHeight: number;
  fovX: number;
  fovY: number;
  fovWidth: number;
  fovHeight: number;

  numCircuits: number; // 1 to 5
  verticalSpacing: number; // default 5 mm
  wallClearance: number; // default 2 mm
  fovReturnClearance: number; // default 2 mm
  strokeWidth: number; // default 0.6 mm

  p1: Point | null;
  p2: Point | null;
  allowPointsInsideFov: boolean;
}

export const defaultLayoutParams: LayoutParams = {
  partWidth: 100,
  partHeight: 70,
  fovX: 20,
  fovY: 15,
  fovWidth: 60,
  fovHeight: 40,

  numCircuits: 1,
  verticalSpacing: 5,
  wallClearance: 2,
  fovReturnClearance: 2,
  strokeWidth: 0.6,

  p1: null,
  p2: null,
  allowPointsInsideFov: false,
};
