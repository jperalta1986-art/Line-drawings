import type { Circuit, LayoutParams, Point, Segment, SegmentType } from '../types';

export interface LayoutResult {
  circuits: Circuit[];
  validationErrors: string[];
  totalLengthMm: number;
}

export function generateSerpentineLayout(params: LayoutParams): LayoutResult {
  const errors: string[] = [];
  const circuits: Circuit[] = [];
  let totalLengthMm = 0;

  if (!params.p1 || !params.p2) {
    errors.push("P1 and P2 must be selected.");
    return { circuits, validationErrors: errors, totalLengthMm };
  }

  const partRect = { x: 0, y: 0, width: params.partWidth, height: params.partHeight };
  const fovRect = { x: params.fovX, y: params.fovY, width: params.fovWidth, height: params.fovHeight };

  if (!params.allowPointsInsideFov) {
    const isInsideFov = (p: Point) =>
      p.x > fovRect.x && p.x < fovRect.x + fovRect.width &&
      p.y > fovRect.y && p.y < fovRect.y + fovRect.height;

    if (isInsideFov(params.p1) || isInsideFov(params.p2)) {
      errors.push("P1 and P2 cannot be inside the FoV unless overridden.");
      return { circuits, validationErrors: errors, totalLengthMm };
    }
  }

  if (
    params.p1.x < 0 || params.p1.x > params.partWidth || params.p1.y < 0 || params.p1.y > params.partHeight ||
    params.p2.x < 0 || params.p2.x > params.partWidth || params.p2.y < 0 || params.p2.y > params.partHeight
  ) {
    errors.push("P1 and P2 must be inside the part boundary.");
    return { circuits, validationErrors: errors, totalLengthMm };
  }

  // 1. Calculate available vertical spacing and number of runs

  // Start the first line such that the whole pattern is roughly centered in the FOV, or just start at fovRect.x
  let startX = fovRect.x;

  // Make sure startX is within part width - wall clearance
  if (startX < params.wallClearance) startX = params.wallClearance;

  // Determine how many vertical lines we can fit
  // We can place lines from startX up to fovRect.x + fovRect.width roughly.
  // To ensure we cover it, we can keep placing lines as long as x <= fovRect.x + fovRect.width
  const maxFitX = partRect.width - params.wallClearance;

  // Let's collect all vertical line X coordinates
  const verticalXCoords: number[] = [];
  let currX = startX;
  while (currX <= maxFitX && currX <= fovRect.x + fovRect.width) {
    verticalXCoords.push(currX);
    currX += params.verticalSpacing;
  }

  // If we don't even have enough lines for one circuit...
  if (verticalXCoords.length < params.numCircuits) {
    errors.push("Not enough space to fit even one circuit run.");
    return { circuits, validationErrors: errors, totalLengthMm };
  }

  // Adjust vertical lines to be a multiple of numCircuits so each circuit has the same number of vertical runs?
  // Actually, a serpentine needs an EVEN number of vertical runs per circuit to start and end on the same side,
  // or ODD to end on the opposite side. We will just use whatever we have, but assign them round-robin to circuits.
  // So Circuit 0 gets line 0, N, 2N...
  // Circuit 1 gets line 1, N+1, 2N+1...

  // To keep top/bottom alternating correct, all circuits should ideally go down, then turn, then go up.
  // If they turn together, they need concentric horizontal returns.
  // If circuit 0,1..N-1 go down, their first returns are at the bottom.
  // To avoid crossing, circuit N-1 must turn first (innermost), then N-2, ... then 0 (outermost).

  // Top return band: above FoV
  const bottomOfTopBand = fovRect.y - params.fovReturnClearance;
  const topOfTopBand = params.wallClearance;
  const topBandAvailableHeight = bottomOfTopBand - topOfTopBand;

  // Bottom return band: below FoV
  const topOfBottomBand = fovRect.y + fovRect.height + params.fovReturnClearance;
  const bottomOfBottomBand = partRect.height - params.wallClearance;
  const bottomBandAvailableHeight = bottomOfBottomBand - topOfBottomBand;

  // Each horizontal return needs some vertical space. If N circuits, we need N horizontal returns stacked.
  // Minimum vertical spacing between returns? Let's say it's also `params.verticalSpacing` or `params.strokeWidth + some margin`.
  // Let's use `params.verticalSpacing` for horizontal spacing too, to maintain uniform gap.
  const returnSpacing = params.verticalSpacing;

  if (topBandAvailableHeight < returnSpacing * params.numCircuits) {
    errors.push("Not enough top clearance for horizontal returns.");
  }
  if (bottomBandAvailableHeight < returnSpacing * params.numCircuits) {
    errors.push("Not enough bottom clearance for horizontal returns.");
  }

  if (errors.length > 0) {
    return { circuits, validationErrors: errors, totalLengthMm };
  }

  const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];

  // Initialize circuits
  for (let c = 0; c < params.numCircuits; c++) {
    circuits.push({
      id: c + 1,
      color: colors[c % colors.length],
      points: [],
      segments: [],
      lengthMm: 0
    });
  }

  // We will distribute the vertical lines to circuits
  // For a single serpentine block going back and forth:
  // Run 0 goes down. Run 1 goes up. Run 2 goes down...
  // Wait, if N circuits, all N run down, then turn, then all N run up.
  // So lines 0..(N-1) go DOWN.
  // lines N..(2N-1) go UP.
  // lines 2N..(3N-1) go DOWN.

  // Group the vertical lines into groups of N.
  const numGroups = Math.floor(verticalXCoords.length / params.numCircuits);
  if (numGroups === 0) {
     errors.push("Not enough lines to complete circuit routing.");
     return { circuits, validationErrors: errors, totalLengthMm };
  }

  // To make sure everyone ends up routed, we only use up to numGroups * N lines
  const usedLines = verticalXCoords.slice(0, numGroups * params.numCircuits);

  for (let c = 0; c < params.numCircuits; c++) {
    let circuitPoints: Point[] = [];

    for (let g = 0; g < numGroups; g++) {
      const isGoingDown = g % 2 === 0;
      const cIndex = isGoingDown ? c : (params.numCircuits - 1 - c);
      const lineIndex = g * params.numCircuits + cIndex;
      const x = usedLines[lineIndex];

      let startY = 0;
      let endY;

      if (isGoingDown) {
        if (g > 0) {
          startY = bottomOfTopBand - (c + 1) * returnSpacing;
        } else {
          startY = 0; // Will be set by lead-in logic
        }

        if (g < numGroups - 1) {
          endY = topOfBottomBand + (params.numCircuits - c) * returnSpacing;
        } else {
          endY = 0; // Will be set by lead-out logic
        }
      } else {
        if (g > 0) {
          startY = topOfBottomBand + (params.numCircuits - c) * returnSpacing;
        }

        if (g < numGroups - 1) {
          endY = bottomOfTopBand - (c + 1) * returnSpacing;
        } else {
          endY = 0; // Will be set by lead-out logic
        }
      }

      if (g > 0) {
        const prevCIndex = (!isGoingDown) ? c : (params.numCircuits - 1 - c);
        const prevX = usedLines[(g - 1) * params.numCircuits + prevCIndex];
        circuitPoints.push({ x: prevX, y: startY });
        circuitPoints.push({ x: x, y: startY });
      }

      circuitPoints.push({ x: x, y: endY });
    }

        const firstLineX = usedLines[c];

    // Lead-in routing
    const routeY1 = params.wallClearance + c * returnSpacing;

    const leadInPoints: Point[] = [];
    leadInPoints.push({ x: params.p1.x, y: params.p1.y });
    leadInPoints.push({ x: params.p1.x, y: routeY1 });
    leadInPoints.push({ x: firstLineX, y: routeY1 });

    // Set the true start point Y of the first group
    circuitPoints[0].y = routeY1;

    // Lead-out routing
    const lastGroup = numGroups - 1;
    const lastGroupIsDown = lastGroup % 2 === 0;
    const lastCIndex = lastGroupIsDown ? c : (params.numCircuits - 1 - c);
    const lastLineX = usedLines[lastGroup * params.numCircuits + lastCIndex];

    const leadOutPoints: Point[] = [];

    // Bottom envelope:
    const bottomOutY = params.partHeight - params.wallClearance - c * returnSpacing;

    if (lastGroupIsDown) {
      circuitPoints[circuitPoints.length - 1].y = bottomOutY;
      leadOutPoints.push({ x: lastLineX, y: bottomOutY });
      leadOutPoints.push({ x: params.p2.x, y: bottomOutY });
    } else {
      const rightOutX = params.partWidth - params.wallClearance - c * returnSpacing;
      const topOutY = params.wallClearance + c * returnSpacing;

      circuitPoints[circuitPoints.length - 1].y = topOutY;

      leadOutPoints.push({ x: lastLineX, y: topOutY });
      leadOutPoints.push({ x: rightOutX, y: topOutY });
      leadOutPoints.push({ x: rightOutX, y: bottomOutY });
      leadOutPoints.push({ x: params.p2.x, y: bottomOutY });
    }
    leadOutPoints.push({ x: params.p2.x, y: params.p2.y });

    circuitPoints = [...leadInPoints, ...circuitPoints, ...leadOutPoints];

    // Remove consecutive duplicates
    const finalPoints: Point[] = [];
    for (const pt of circuitPoints) {
      if (finalPoints.length === 0) {
        finalPoints.push(pt);
      } else {
        const last = finalPoints[finalPoints.length - 1];
        if (Math.abs(last.x - pt.x) > 1e-6 || Math.abs(last.y - pt.y) > 1e-6) {
          finalPoints.push(pt);
        }
      }
    }

    // Convert to segments and calculate length
    let len = 0;
    const segments: Segment[] = [];
    for (let i = 0; i < finalPoints.length - 1; i++) {
      const pA = finalPoints[i];
      const pB = finalPoints[i+1];
      const segLen = Math.sqrt(Math.pow(pA.x - pB.x, 2) + Math.pow(pA.y - pB.y, 2));
      len += segLen;

      // Determine type
      let type: SegmentType = 'connection';
      if (Math.abs(pA.x - pB.x) < 1e-6) {
        if (Math.abs(pA.y - pB.y) >= fovRect.height * 0.5 && pA.x !== params.p2.x && pA.x !== params.p1.x && pA.x !== params.partWidth - params.wallClearance && pA.x !== params.partWidth - params.wallClearance - c * returnSpacing) {
          type = 'vertical';
        }
      } else {
        type = 'horizontal-return';
      }

      segments.push({
        x1: pA.x, y1: pA.y,
        x2: pB.x, y2: pB.y,
        type
      });
    }

    circuits[c].points = finalPoints;
    circuits[c].segments = segments;
    circuits[c].lengthMm = len;
    totalLengthMm += len;
  }

  return {
    circuits,
    validationErrors: errors,
    totalLengthMm
  };
}
