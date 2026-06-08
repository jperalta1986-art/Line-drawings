import React, { useState } from 'react';
import type { LayoutParams, Circuit, Point } from '../types';

interface PlotAreaProps {
  params: LayoutParams;
  circuits: Circuit[];
  selectingP1: boolean;
  selectingP2: boolean;
  onPointSelected: (pt: Point, isP1: boolean) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const PlotArea: React.FC<PlotAreaProps> = ({
  params,
  circuits,
  selectingP1,
  selectingP2,
  onPointSelected,
  svgRef
}) => {
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const getSvgPoint = (e: React.MouseEvent<SVGElement> | React.PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const handlePointerDown = (e: React.PointerEvent<SVGElement>, pointType: 'p1' | 'p2') => {
    e.stopPropagation(); // prevent triggering the SVG onClick
    setDragging(pointType);
    if (svgRef.current) {
        svgRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    const svgP = getSvgPoint(e);
    if (svgP) {
      setCursorPos({ x: svgP.x, y: svgP.y });
    }

    if (dragging && svgP) {
      // Validate bounds during drag
      let { x, y } = svgP;
      if (x < 0) x = 0;
      if (x > params.partWidth) x = params.partWidth;
      if (y < 0) y = 0;
      if (y > params.partHeight) y = params.partHeight;

      const inFoV = x > params.fovX && x < params.fovX + params.fovWidth &&
                    y > params.fovY && y < params.fovY + params.fovHeight;

      if (inFoV && !params.allowPointsInsideFov) {
        // Can't drag into FoV
        return;
      }

      onPointSelected({ x, y }, dragging === 'p1');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    setDragging(null);
    if (svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleClick = (e: React.MouseEvent<SVGElement>) => {
    if (dragging) return;
    if (!selectingP1 && !selectingP2) return;
    if (!svgRef.current) return;

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (ctm) {
      const svgP = pt.matrixTransform(ctm.inverse());

      // Check if inside part
      if (svgP.x < 0 || svgP.x > params.partWidth || svgP.y < 0 || svgP.y > params.partHeight) {
        alert("Points must be inside the part boundary.");
        return;
      }

      // Check if point is inside FoV
      const inFoV = svgP.x > params.fovX && svgP.x < params.fovX + params.fovWidth &&
                    svgP.y > params.fovY && svgP.y < params.fovY + params.fovHeight;

      if (inFoV && !params.allowPointsInsideFov) {
        alert("Points cannot be inside the FoV unless overridden.");
        return;
      }

      onPointSelected({ x: svgP.x, y: svgP.y }, selectingP1);
    }
  };

  const viewBoxWidth = params.partWidth + 20;
  const viewBoxHeight = params.partHeight + 20;

  return (
    <div className="plot-area">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`-10 -10 ${viewBoxWidth} ${viewBoxHeight}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        style={{ cursor: selectingP1 || selectingP2 ? 'crosshair' : 'default', touchAction: 'none' }}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
          </pattern>
        </defs>

        <rect x="-10" y="-10" width={viewBoxWidth} height={viewBoxHeight} fill="url(#grid)" />

        {/* Part Boundary */}
        <rect
          x="0"
          y="0"
          width={params.partWidth}
          height={params.partHeight}
          fill="none"
          stroke="black"
          strokeWidth="1.5"
        />

        {/* FoV Boundary */}
        <rect
          x={params.fovX}
          y={params.fovY}
          width={params.fovWidth}
          height={params.fovHeight}
          fill="none"
          stroke="red"
          strokeWidth="1.5"
          strokeDasharray="5,5"
        />

        {/* Circuits */}
        {circuits.map(circuit => (
          <polyline
            key={circuit.id}
            points={circuit.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={circuit.color}
            strokeWidth={params.strokeWidth}
            strokeLinejoin="miter"
          />
        ))}

        {/* P1 */}
        {params.p1 && (
          <g transform={`translate(${params.p1.x}, ${params.p1.y})`}
             onPointerDown={(e) => handlePointerDown(e, 'p1')}
             style={{ cursor: 'grab' }}>
            <circle r="3" fill="#007bff" />
            <circle r="6" fill="transparent" /> {/* Larger hit area */}
            <text x="5" y="-5" fontSize="6" fill="#007bff" style={{ pointerEvents: 'none' }}>P1</text>
          </g>
        )}

        {/* P2 */}
        {params.p2 && (
          <g transform={`translate(${params.p2.x}, ${params.p2.y})`}
             onPointerDown={(e) => handlePointerDown(e, 'p2')}
             style={{ cursor: 'grab' }}>
            <circle r="3" fill="#28a745" />
            <circle r="6" fill="transparent" /> {/* Larger hit area */}
            <text x="5" y="-5" fontSize="6" fill="#28a745" style={{ pointerEvents: 'none' }}>P2</text>
          </g>
        )}
      </svg>
      {cursorPos && (
        <div className="cursor-pos">
          {cursorPos.x.toFixed(1)} mm, {cursorPos.y.toFixed(1)} mm
        </div>
      )}
    </div>
  );
};
