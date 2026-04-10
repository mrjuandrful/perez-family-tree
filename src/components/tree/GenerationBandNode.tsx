import { memo } from 'react';

// Pastel colors per generation (0 = great-grandparents, cycling if deeper)
const BAND_COLORS = [
  'rgba(233, 213, 255, 0.35)', // gen 0 — purple-100
  'rgba(199, 210, 254, 0.35)', // gen 1 — indigo-200
  'rgba(186, 230, 253, 0.35)', // gen 2 — sky-200
  'rgba(187, 247, 208, 0.35)', // gen 3 — green-200
  'rgba(254, 240, 138, 0.35)', // gen 4 — yellow-200
  'rgba(253, 186, 116, 0.25)', // gen 5 — orange-200
];

interface GenerationBandProps {
  data: { generation: number; label: string };
}

function GenerationBandNode({ data }: GenerationBandProps) {
  const color = BAND_COLORS[data.generation % BAND_COLORS.length];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: color,
        borderRadius: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(100,100,120,0.5)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {data.label}
      </span>
    </div>
  );
}

export default memo(GenerationBandNode);
