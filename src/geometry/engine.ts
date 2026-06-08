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
  let maxFitX = partRect.width - params.wallClearance;

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
      // The line index for circuit c in group g
      const lineIndex = g * params.numCircuits + c;
      const x = usedLines[lineIndex];

      // Determine vertical extents for this run
      // In group g, circuits need to nest their returns.
      // Top returns: when going from UP to DOWN (g is even, g > 0)
      // Bottom returns: when going from DOWN to UP (g is odd)

      let startY = 0;
      let endY = 0;

      if (isGoingDown) {
        // start at top, end at bottom
        // Top Y coordinate depends on the previous return (if g > 0)
        // If g == 0, it's the very first run. Start at some default top Y.
        // Let's say top of top band.
        startY = topOfTopBand + c * returnSpacing; // just an initial entry point
        if (g > 0) {
          // It's coming from an UP run in group g-1
          // We need to nest. In group g-1, the circuit went UP. Then it turns right, then DOWN.
          // To nest properly at the TOP:
          // The outermost turn is circuit 0 (smallest x going UP, largest x going DOWN)
          // Actually, group g-1 is UP, group g is DOWN.
          // The lines are ordered left to right:
          // g-1 (UP):   c=0, c=1, ..., c=N-1
          // g (DOWN): c=0, c=1, ..., c=N-1
          // Turning right from g-1 to g:
          // c=N-1 has the shortest horizontal distance. It should be the INNERMOST return (lowest Y in top band).
          // c=0 has the longest horizontal distance. It should be the OUTERMOST return (highest Y in top band).
          // Higher Y means lower visually (top is Y=0). Wait, Y increases downwards.
          // So outermost = lowest Y value. innermost = highest Y value (closer to FoV).
          // Outermost (c=0) -> y = bottomOfTopBand - N*returnSpacing
          // Innermost (c=N-1) -> y = bottomOfTopBand - 1*returnSpacing
          startY = bottomOfTopBand - (params.numCircuits - c) * returnSpacing;
        }

        // End at bottom band for the next turn, or if it's the last run, just end somewhere.
        if (g < numGroups - 1) {
          // The next turn will be at the bottom, from DOWN to UP.
          // Group g (DOWN), Group g+1 (UP)
          // Lines left to right:
          // g (DOWN): c=0, c=1, ..., c=N-1
          // g+1 (UP): c=0, c=1, ..., c=N-1
          // Turning right from g to g+1:
          // c=N-1 has shortest distance -> INNERMOST (highest Y = lowest value numerically, i.e., closer to FoV)
          // c=0 has longest distance -> OUTERMOST (lowest Y = highest value numerically, closer to part bottom)
          // Innermost (c=N-1): y = topOfBottomBand + 1*returnSpacing
          // Outermost (c=0): y = topOfBottomBand + N*returnSpacing
          endY = topOfBottomBand + (params.numCircuits - c) * returnSpacing;
        } else {
          // Last run, just end at the top of bottom band
          endY = topOfBottomBand + c * returnSpacing;
        }
      } else {
        // Going UP
        // Start at bottom
        if (g > 0) {
          // Coming from DOWN in g-1
          startY = topOfBottomBand + (params.numCircuits - c) * returnSpacing;
        }

        if (g < numGroups - 1) {
          // Next turn is at top, from UP to DOWN
          endY = bottomOfTopBand - (params.numCircuits - c) * returnSpacing;
        } else {
          // Last run
          endY = bottomOfTopBand - c * returnSpacing;
        }
      }

      // If g > 0, we need to add the horizontal return segment to connect previous run's end to this run's start
      if (g > 0) {
        // previous point was (prevX, prevEndY)
        // new point is (x, startY)
        // wait, the previous run ended at `startY` (which was `endY` of previous run)
        // so prev point is (prevX, startY)
        const prevX = usedLines[(g - 1) * params.numCircuits + c];
        circuitPoints.push({ x: prevX, y: startY }); // this might be a duplicate, let's just trace carefully
        circuitPoints.push({ x: x, y: startY });
      } else {
        // For the very first run, start it
        circuitPoints.push({ x: x, y: startY });
      }

      circuitPoints.push({ x: x, y: endY });
    }

    // Now circuitPoints has the basic serpentine.
    // We need to connect P1 to the start, and P2 to the end.
    // For multiple circuits, P1 and P2 might just connect to circuit 0? Or do they connect to all?
    // "Connect P1 to the first vertical run using only horizontal/vertical lead-in segments."
    // If N > 1, connecting a single P1 to N circuits implies branching, which violates "independent parallel circuits".
    // Usually, P1 and P2 are buses, but let's just make P1 connect to Circuit 0's start, and P2 to Circuit 0's end,
    // OR we connect P1 to all circuits' starts.
    // Wait, the prompt says: "For multiple circuits, generate independent parallel circuits... Each circuit must have its own length."
    // And "P1 and P2 are user-selected terminal points."
    // If there are multiple circuits, how do P1/P2 relate?
    // Let's assume P1 connects to the starts of ALL circuits (as a bus), and P2 connects to the ends.
    // We will just draw lead-ins from P1 to the start of each circuit, and lead-outs to P2.
    // Let's make P1 connect to circuit c's start with orthogonal segments.

    const startPt = circuitPoints[0];
    const endPt = circuitPoints[circuitPoints.length - 1];

    const leadInPoints: Point[] = [];
    const leadOutPoints: Point[] = [];

    // Connect P1 to startPt
    // Route: P1 -> (P1.x, P1_routing_y) -> (startPt.x, P1_routing_y) -> startPt
    // We need to avoid intersecting the fov if possible, though vertical runs can.
    // The easiest L-shape or 3-segment orthogonal path.
    let routeY1 = topOfTopBand - params.wallClearance / 2 + c * (returnSpacing / 2); // just some Y above the top band
    if (routeY1 < 0) routeY1 = params.wallClearance / 2;

    leadInPoints.push({ x: params.p1.x, y: params.p1.y });
    leadInPoints.push({ x: params.p1.x, y: routeY1 });
    leadInPoints.push({ x: startPt.x, y: routeY1 });
    // startPt is already the next

    // Connect P2 to endPt
    let routeY2 = bottomOfBottomBand + params.wallClearance / 2 - c * (returnSpacing / 2);
    if (routeY2 > partRect.height) routeY2 = partRect.height - params.wallClearance / 2;

    // we go from endPt -> (endPt.x, routeY2) -> (p2.x, routeY2) -> p2
    leadOutPoints.push({ x: endPt.x, y: routeY2 });
    leadOutPoints.push({ x: params.p2.x, y: routeY2 });
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
        if (Math.abs(pA.y - pB.y) >= fovRect.height * 0.5) {
          type = 'vertical';
        } else {
          type = 'connection';
        }
      } else {
        type = 'horizontal-return'; // simplistic, will refine later if needed
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
