import { useMemo, useState } from 'react';
import BoundingBoxAnnotator from '../../../bounding box/BoundingBoxAnnotator';
import { droneImageList, getDroneImageUrl } from '../../../bounding box/droneImages';

const PATCH_SIZE = 5;
const HEAT_ROWS = 20;
const HEAT_COLS = 20;

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

const INITIAL_ANNOTATIONS = {
  // Large stepped pit and water body on left/bottom – tight, slightly lowered from original
  'WhatsApp Image 2025-12-09 at 2.48.55 AM.jpeg': [
    { id: 'img2-box1', x: 0.10, y: 0.67, width: 0.40, height: 0.32, risk: 'HIGH' },
  ],
  // Two main pit lobes either side of the saddle
  'WhatsApp Image 2025-12-09 at 2.48.56 AM (1).jpeg': [
    { id: 'img3-box1', x: -0.15, y: 0.05, width: 0.35, height: 0.60, risk: 'HIGH' },
    { id: 'img3-box2', x: 0.65, y: 0.64, width: 0.35, height: 0.38, risk: 'MEDIUM' },
  ],
  // Broad pit plateau in the centre
  'WhatsApp Image 2025-12-09 at 2.48.56 AM.jpeg': [
    // Left pit
    { id: 'img5-box1', x: 0.08, y: 0.05, width: 0.22, height: 0.30, risk: 'HIGH' },
    // Central pit
    { id: 'img5-box2', x: 0.20, y: 0.65, width: 0.22, height: 0.28, risk: 'HIGH' },
    // Right pit
    { id: 'img5-box3', x: 0.47, y: 0.26, width: 0.22, height: 0.30, risk: 'MEDIUM' },
  ],
  // Dominant pit on the right half
  'WhatsApp Image 2025-12-09 at 2.48.57 AM.jpeg': [
    { id: 'img7-box1', x: 0.04, y: 0.84, width: 0.40, height: 0.30, risk: 'HIGH' },
  ],
  // Water-filled central pit
  'WhatsApp Image 2025-12-09 at 2.48.58 AM.jpeg': [
    { id: 'img10-box1', x: 0.08, y: 0.32, width: 0.84, height: 0.44, risk: 'HIGH' },
  ],
  // Pit above small pond
  'WhatsApp Image 2025-12-09 at 2.48.59 AM (1).jpeg': [
    { id: 'img11-box1', x: 0.30, y: 0.42, width: 0.40, height: 0.34, risk: 'MEDIUM' },
  ],
  // Steep highwall and floor
  'WhatsApp Image 2025-12-09 at 2.49.01 AM (1).jpeg': [
    { id: 'img14-box1', x: 0.17, y: 0.57, width: 0.52, height: 0.40, risk: 'HIGH' },
  ],
};

import { useTranslation } from 'react-i18next';

export default function DroneImagery() {
  const { t } = useTranslation('operator');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotations, setAnnotations] = useState(INITIAL_ANNOTATIONS);

  const currentName = droneImageList[currentIndex];
  const currentBoxes = annotations[currentName] || [];
  const imageUrl = getDroneImageUrl(currentName);

  const totalBoxes = useMemo(
    () => Object.values(annotations).reduce((sum, arr) => sum + ((arr && arr.length) || 0), 0),
    [annotations],
  );

  const handleBoxesChange = (next) => {
    setAnnotations((prev) => ({
      ...prev,
      [currentName]: Array.isArray(next) ? next : [],
    }));
  };

  const goPrev = () => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
  };

  const goNext = () => {
    setCurrentIndex((idx) => (idx < droneImageList.length - 1 ? idx + 1 : idx));
  };

  return (
    <div className="section space-y-4">
      <div className="mb-2">
        <h2 className="mb-1">{t('drone_imagery.title')}</h2>
        <p className="subtext">
          {t('drone_imagery.subtitle')}
        </p>
      </div>

      <div className="card flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              {t('drone_imagery.previous')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={goNext}
              disabled={currentIndex === droneImageList.length - 1}
            >
              {t('drone_imagery.next')}
            </button>
            <span className="text-slate-700">
              {t('drone_imagery.frame_info', { current: currentIndex + 1, total: droneImageList.length, name: currentName })}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            {t('drone_imagery.total_boxes', { count: totalBoxes })}
          </div>
        </div>
        <div className="text-xs text-slate-600">
          {t('drone_imagery.instruction')}
        </div>
      </div>

      <div className="card">
        <BoundingBoxAnnotator imageUrl={imageUrl} boxes={currentBoxes} onChange={handleBoxesChange} />
      </div>
    </div>
  );
}
