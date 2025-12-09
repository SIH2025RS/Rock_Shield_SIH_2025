import { useEffect, useMemo, useRef, useState } from 'react';

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function computeHeatmap(boxes, rows, cols) {
  const data = Array.from({ length: rows }, () => Array(cols).fill(0));
  let maxValue = 0;

  for (const b of boxes || []) {
    if (!b || b.width <= 0 || b.height <= 0) continue;
    const x0 = clamp01(b.x);
    const y0 = clamp01(b.y);
    const x1 = clamp01(b.x + b.width);
    const y1 = clamp01(b.y + b.height);

    const colStart = Math.max(0, Math.floor(x0 * cols));
    const colEnd = Math.min(cols - 1, Math.floor(x1 * cols));
    const rowStart = Math.max(0, Math.floor(y0 * rows));
    const rowEnd = Math.min(rows - 1, Math.floor(y1 * rows));

    for (let r = rowStart; r <= rowEnd; r += 1) {
      for (let c = colStart; c <= colEnd; c += 1) {
        data[r][c] += 1;
        if (data[r][c] > maxValue) maxValue = data[r][c];
      }
    }
  }

  return { data, maxValue };
}

function getRiskColors(risk) {
  const level = (risk || '').toUpperCase();
  if (level === 'MEDIUM' || level === 'YELLOW') {
    return { border: '#facc15', fill: 'rgba(250, 204, 21, 0.15)' };
  }
  if (level === 'LOW') {
    return { border: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)' };
  }
  // Default and HIGH risk: red
  return { border: '#dc2626', fill: 'rgba(220, 38, 38, 0.10)' };
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function BoundingBoxAnnotator({ imageUrl, boxes, onChange }) {
  const containerRef = useRef(null);
  const [localBoxes, setLocalBoxes] = useState(() => (Array.isArray(boxes) ? boxes : []));
  const [viewMode, setViewMode] = useState('boxes');
  const drawingRef = useRef(false);
  const startRef = useRef(null);
  const activeIdRef = useRef(null);

  useEffect(() => {
    setLocalBoxes(Array.isArray(boxes) ? boxes : []);
  }, [boxes]);

  const rows = 20;
  const cols = 20;

  const { data: heatmapData, maxValue } = useMemo(
    () => computeHeatmap(localBoxes, rows, cols),
    [localBoxes, rows, cols],
  );

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);

    drawingRef.current = true;
    startRef.current = { x, y };
    const id = createId();
    activeIdRef.current = id;

    const next = [...localBoxes, { id, x, y, width: 0, height: 0 }];
    setLocalBoxes(next);
    if (onChange) onChange(next);
  };

  const handleMouseMove = (e) => {
    if (!drawingRef.current || !containerRef.current || !startRef.current || !activeIdRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ex = clamp01((e.clientX - rect.left) / rect.width);
    const ey = clamp01((e.clientY - rect.top) / rect.height);

    const { x: sx, y: sy } = startRef.current;
    const x = Math.min(sx, ex);
    const y = Math.min(sy, ey);
    const width = Math.abs(ex - sx);
    const height = Math.abs(ey - sy);

    const id = activeIdRef.current;
    const next = localBoxes.map((b) => (b.id === id ? { ...b, x, y, width, height } : b));
    setLocalBoxes(next);
    if (onChange) onChange(next);
  };

  const finishDrawing = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    startRef.current = null;
    const id = activeIdRef.current;
    activeIdRef.current = null;

    if (!id) return;

    const minSize = 0.01;
    let changed = false;
    const next = localBoxes.filter((b) => {
      if (b.id !== id) return true;
      if ((b.width ?? 0) < minSize || (b.height ?? 0) < minSize) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      setLocalBoxes(next);
      if (onChange) onChange(next);
    }
  };

  const handleMouseUp = () => {
    finishDrawing();
  };

  const handleMouseLeave = () => {
    finishDrawing();
  };

  const handleRemoveBox = (id) => {
    const next = localBoxes.filter((b) => b.id !== id);
    setLocalBoxes(next);
    if (onChange) onChange(next);
  };

  const handleClear = () => {
    setLocalBoxes([]);
    if (onChange) onChange([]);
  };

  const totalBoxes = localBoxes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn-tab ${viewMode === 'boxes' ? 'btn-tab-active' : ''}`}
            onClick={() => setViewMode('boxes')}
          >
            Boxes
          </button>
          <button
            type="button"
            className={`btn-tab ${viewMode === 'heatmap' ? 'btn-tab-active' : ''}`}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>
            Boxes on this frame:
            {' '}
            {totalBoxes}
          </span>
          <button type="button" className="btn-secondary" onClick={handleClear} disabled={!totalBoxes}>
            Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto border rounded-xl overflow-hidden bg-black/5 cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageUrl}
          alt="Drone frame"
          className="block w-full h-auto pointer-events-none"
        />
        <div className="absolute inset-0">
          {viewMode === 'boxes' && localBoxes.map((b) => (
            (() => {
              const colors = getRiskColors(b.risk);
              return (
                <div
                  key={b.id}
                  className="absolute border-2"
                  style={{
                    left: `${clamp01(b.x) * 100}%`,
                    top: `${clamp01(b.y) * 100}%`,
                    width: `${clamp01(b.width) * 100}%`,
                    height: `${clamp01(b.height) * 100}%`,
                    borderColor: colors.border,
                    backgroundColor: colors.fill,
                  }}
                />
              );
            })()
          ))}

          {viewMode === 'heatmap' && maxValue > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {heatmapData.map((row, rIdx) => (
                row.map((value, cIdx) => {
                  if (!value) return null;
                  const intensity = value / maxValue;
                  const alpha = 0.15 + 0.55 * intensity;
                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className="absolute"
                      style={{
                        left: `${(cIdx / cols) * 100}%`,
                        top: `${(rIdx / rows) * 100}%`,
                        width: `${100 / cols}%`,
                        height: `${100 / rows}%`,
                        backgroundColor: `rgba(239, 68, 68, ${alpha})`,
                      }}
                    />
                  );
                })
              ))}
            </div>
          )}
        </div>
      </div>

      {localBoxes.length > 0 && (
        <div className="rounded-lg border bg-white/60 p-3 text-xs text-slate-700 space-y-1 max-h-40 overflow-auto">
          {localBoxes.map((b, idx) => (
            <div key={b.id} className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium mr-2">Box {idx + 1}</span>
                <span>
                  x:
                  {' '}
                  {Math.round(clamp01(b.x) * 100)}%
                  , y:
                  {' '}
                  {Math.round(clamp01(b.y) * 100)}%
                  , w:
                  {' '}
                  {Math.round(clamp01(b.width) * 100)}%
                  , h:
                  {' '}
                  {Math.round(clamp01(b.height) * 100)}%
                  {b.risk ? ` · risk: ${String(b.risk).toUpperCase()}` : ''}
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleRemoveBox(b.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
