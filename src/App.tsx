import { useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { PlotArea } from './components/PlotArea';
import { defaultLayoutParams } from "./types";
import type { LayoutParams, Point, Circuit } from './types';
import { generateSerpentineLayout } from './geometry/engine';
import './App.css';

function App() {
  const [params, setParams] = useState<LayoutParams>(defaultLayoutParams);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [totalLengthMm, setTotalLengthMm] = useState<number>(0);

  const [selectingP1, setSelectingP1] = useState(false);
  const [selectingP2, setSelectingP2] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const handleGenerate = () => {
    const result = generateSerpentineLayout(params);
    setValidationErrors(result.validationErrors);
    setCircuits(result.circuits);
    setTotalLengthMm(result.totalLengthMm);
  };

  const handleClear = () => {
    setCircuits([]);
    setValidationErrors([]);
    setTotalLengthMm(0);
  };

  const handleReset = () => {
    setParams(defaultLayoutParams);
    handleClear();
  };

  const handlePointSelected = (pt: Point, isP1: boolean) => {
    setParams(prev => {
      const nextParams = { ...prev, [isP1 ? 'p1' : 'p2']: pt };
      // Regenerate immediately on point move if we already had a circuit
      if (circuits.length > 0 && nextParams.p1 && nextParams.p2) {
         const result = generateSerpentineLayout(nextParams);
         if (result.validationErrors.length === 0) {
           setCircuits(result.circuits);
           setTotalLengthMm(result.totalLengthMm);
           setValidationErrors([]);
         } else {
           setValidationErrors(result.validationErrors);
         }
      }
      return nextParams;
    });

    if (isP1) {
      setSelectingP1(false);
    } else {
      setSelectingP2(false);
    }
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'layout.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const data = {
      params,
      circuits,
      totalLengthMm
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'layout.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <Sidebar
        params={params}
        setParams={setParams}
        onGenerate={handleGenerate}
        onClear={handleClear}
        onReset={handleReset}
        onSelectP1={() => { setSelectingP1(true); setSelectingP2(false); }}
        onSelectP2={() => { setSelectingP2(true); setSelectingP1(false); }}
        selectingP1={selectingP1}
        selectingP2={selectingP2}
        totalLengthMm={totalLengthMm}
        circuitLengths={circuits.map(c => c.lengthMm)}
        validationErrors={validationErrors}
        onExportSvg={handleExportSvg}
        onExportJson={handleExportJson}
      />
      <div className="main-content">
        <PlotArea
          params={params}
          circuits={circuits}
          selectingP1={selectingP1}
          selectingP2={selectingP2}
          onPointSelected={handlePointSelected}
          svgRef={svgRef}
        />
      </div>
    </div>
  );
}

export default App;
