import React from 'react';
import type { LayoutParams } from '../types';

interface SidebarProps {
  params: LayoutParams;
  setParams: React.Dispatch<React.SetStateAction<LayoutParams>>;
  onGenerate: () => void;
  onClear: () => void;
  onReset: () => void;
  onSelectP1: () => void;
  onSelectP2: () => void;
  selectingP1: boolean;
  selectingP2: boolean;
  totalLengthMm: number;
  circuitLengths: number[];
  validationErrors: string[];
  onExportSvg: () => void;
  onExportJson: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  params,
  setParams,
  onGenerate,
  onClear,
  onReset,
  onSelectP1,
  onSelectP2,
  selectingP1,
  selectingP2,
  totalLengthMm,
  circuitLengths,
  validationErrors,
  onExportSvg,
  onExportJson
}) => {
  const updateParam = (key: keyof LayoutParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const renderInput = (label: string, key: keyof LayoutParams, min: number, max: number, step = 1) => (
    <div className="input-group" key={key}>
      <label>{label}</label>
      <div className="input-controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={params[key] as number}
          onChange={(e) => updateParam(key, parseFloat(e.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={params[key] as number}
          onChange={(e) => updateParam(key, parseFloat(e.target.value))}
        />
      </div>
    </div>
  );

  return (
    <div className="sidebar">
      <h2>Layout Parameters</h2>

      <div className="section">
        <h3>Geometry</h3>
        {renderInput('Part Width (mm)', 'partWidth', 50, 500)}
        {renderInput('Part Height (mm)', 'partHeight', 50, 500)}
        {renderInput('FoV X (mm)', 'fovX', 0, 400)}
        {renderInput('FoV Y (mm)', 'fovY', 0, 400)}
        {renderInput('FoV Width (mm)', 'fovWidth', 10, 400)}
        {renderInput('FoV Height (mm)', 'fovHeight', 10, 400)}
      </div>

      <div className="section">
        <h3>Wire Parameters</h3>
        {renderInput('Number of Circuits', 'numCircuits', 1, 5)}
        {renderInput('Vertical Spacing (mm)', 'verticalSpacing', 1, 20, 0.1)}
        {renderInput('Wall Clearance (mm)', 'wallClearance', 0, 20, 0.1)}
        {renderInput('FoV Return Clearance (mm)', 'fovReturnClearance', 0, 20, 0.1)}
        {renderInput('Stroke Width (mm)', 'strokeWidth', 0.1, 5, 0.1)}
      </div>

      <div className="section">
        <h3>Point Selection</h3>
        <button className={selectingP1 ? 'active' : ''} onClick={onSelectP1}>
          {selectingP1 ? 'Selecting P1...' : 'Select P1'}
        </button>
        <button className={selectingP2 ? 'active' : ''} onClick={onSelectP2}>
          {selectingP2 ? 'Selecting P2...' : 'Select P2'}
        </button>
        <button onClick={() => setParams(prev => ({ ...prev, p1: null, p2: null }))}>
          Clear Points
        </button>
        <div className="point-info">
          P1: {params.p1 ? `${params.p1.x.toFixed(1)}, ${params.p1.y.toFixed(1)}` : 'Not set'}
        </div>
        <div className="point-info">
          P2: {params.p2 ? `${params.p2.x.toFixed(1)}, ${params.p2.y.toFixed(1)}` : 'Not set'}
        </div>
      </div>

      <div className="section">
        <h3>Generation</h3>
        <button className="primary" onClick={onGenerate}>Generate Circuit</button>
        <button onClick={onClear}>Clear Circuit</button>
        <button onClick={onReset}>Reset Defaults</button>
      </div>

      <div className="section">
        <h3>Output</h3>
        {validationErrors.length > 0 && (
          <div className="errors">
            {validationErrors.map((err, i) => <div key={i} className="error">{err}</div>)}
          </div>
        )}
        {validationErrors.length === 0 && totalLengthMm > 0 && (
          <div className="results">
            <div className="success">Validation Passed</div>
            <div>Total Length: {totalLengthMm.toFixed(2)} mm</div>
            {circuitLengths.map((len, i) => (
              <div key={i}>Circuit {i + 1} Length: {len.toFixed(2)} mm</div>
            ))}
          </div>
        )}
        <div className="export-buttons">
          <button onClick={onExportSvg}>Export SVG</button>
          <button onClick={onExportJson}>Export JSON</button>
        </div>
      </div>
    </div>
  );
};
