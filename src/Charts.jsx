/* NeuroMap — Chart block, rendered as hand-built SVG.
   Types: barre, barre orizzontali, linee, area, torta, radar. */

const CHART_PALETTE = [
  'oklch(52% 0.090 178)',
  'oklch(64% 0.130 72)',
  'oklch(57% 0.150 25)',
  'oklch(52% 0.110 320)',
  'oklch(55% 0.110 250)',
  'oklch(54% 0.100 145)',
];

const plusIcon = (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round"><path d="M8 3.5v9M3.5 8h9" /></svg>
);
const xIcon = (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
);

const W = 520;
const H = 240;

function BarChart({ points }) {
  const padX = 14;
  const padBottom = 36;
  const padTop = 22;
  const max = Math.max(1, ...points.map((p) => p.value));
  const chartH = H - padTop - padBottom;
  const baseY = H - padBottom;
  const slot = (W - padX * 2) / points.length;
  const barW = Math.min(slot * 0.6, 64);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <line x1={padX} y1={baseY} x2={W - padX} y2={baseY}
            stroke="var(--rule-strong)" strokeWidth="1" />
      {points.map((p, i) => {
        const h = (p.value / max) * chartH;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = baseY - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx="3"
                  fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize="11"
                  fill="var(--ink-2)" fontFamily="var(--font-mono)">{p.value}</text>
            <text x={x + barW / 2} y={baseY + 17} textAnchor="middle" fontSize="11"
                  fill="var(--ink-3)">{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function HBarChart({ points }) {
  const padL = 96;
  const padR = 46;
  const padY = 16;
  const max = Math.max(1, ...points.map((p) => p.value));
  const chartW = W - padL - padR;
  const slot = (H - padY * 2) / points.length;
  const barH = Math.min(slot * 0.62, 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <line x1={padL} y1={padY} x2={padL} y2={H - padY}
            stroke="var(--rule-strong)" strokeWidth="1" />
      {points.map((p, i) => {
        const w = (p.value / max) * chartW;
        const y = padY + slot * i + (slot - barH) / 2;
        return (
          <g key={i}>
            <rect x={padL} y={y} width={Math.max(0, w)} height={barH} rx="3"
                  fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            <text x={padL - 10} y={y + barH / 2} textAnchor="end" dominantBaseline="central"
                  fontSize="11.5" fill="var(--ink-3)">{p.label}</text>
            <text x={padL + w + 7} y={y + barH / 2} dominantBaseline="central"
                  fontSize="11" fill="var(--ink-2)" fontFamily="var(--font-mono)">{p.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function lineGeometry(points) {
  const padX = 28;
  const padBottom = 36;
  const padTop = 22;
  const max = Math.max(1, ...points.map((p) => p.value));
  const chartH = H - padTop - padBottom;
  const baseY = H - padBottom;
  const single = points.length === 1;
  const stepX = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    ...p,
    x: single ? W / 2 : padX + stepX * i,
    y: baseY - (p.value / max) * chartH,
  }));
  const line = xy.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${xy[xy.length - 1].x.toFixed(1)} ${baseY} `
    + `L ${xy[0].x.toFixed(1)} ${baseY} Z`;
  return { xy, line, area, baseY, padX };
}

function LineChart({ points }) {
  const { xy, line, area, baseY, padX } = lineGeometry(points);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <line x1={padX} y1={baseY} x2={W - padX} y2={baseY}
            stroke="var(--rule-strong)" strokeWidth="1" />
      <path d={area} fill="var(--accent)" opacity=".1" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.6" fill="var(--paper-3)"
                  stroke="var(--accent)" strokeWidth="1.7" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10.5"
                fill="var(--ink-2)" fontFamily="var(--font-mono)">{p.value}</text>
          <text x={p.x} y={baseY + 17} textAnchor="middle" fontSize="11"
                fill="var(--ink-3)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function AreaChart({ points }) {
  const { xy, line, area, baseY } = lineGeometry(points);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <line x1={28} y1={baseY} x2={W - 28} y2={baseY}
            stroke="var(--rule-strong)" strokeWidth="1" />
      <path d={area} fill="var(--accent)" opacity=".28" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.8" fill="var(--accent)" />
          <text x={p.x} y={baseY + 17} textAnchor="middle" fontSize="11"
                fill="var(--ink-3)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ points }) {
  const cx = 122;
  const cy = H / 2;
  const r = 86;
  const total = points.reduce((s, p) => s + Math.max(0, p.value), 0);
  let angle = -Math.PI / 2;
  const slices = points.map((p, i) => {
    const frac = total > 0 ? Math.max(0, p.value) / total : 1 / points.length;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    return {
      ...p,
      frac,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      d: `M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} `
        + `A ${r} ${r} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`,
    };
  });
  const legendY = cy - slices.length * 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      {total > 0
        ? slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="var(--paper-3)" strokeWidth="1.5" />
        ))
        : <circle cx={cx} cy={cy} r={r} fill="var(--paper-2)" stroke="var(--rule)" />}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(248 ${legendY + i * 24})`}>
          <rect width="12" height="12" rx="3" fill={s.color} />
          <text x="20" y="10.5" fontSize="12.5" fill="var(--ink-2)">{s.label}</text>
          <text x="246" y="10.5" fontSize="12" fill="var(--ink-3)" textAnchor="end"
                fontFamily="var(--font-mono)">{Math.round(s.frac * 100)}%</text>
        </g>
      ))}
    </svg>
  );
}

function RadarChart({ points }) {
  const cx = W / 2;
  const cy = H / 2 + 4;
  const r = 84;
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.value));
  const angleAt = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i, radius) => [cx + Math.cos(angleAt(i)) * radius, cy + Math.sin(angleAt(i)) * radius];
  const ring = (f) => points
    .map((_, i) => { const [x, y] = pt(i, r * f); return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`; })
    .join(' ') + ' Z';
  const dataPath = points
    .map((p, i) => {
      const [x, y] = pt(i, (Math.max(0, p.value) / max) * r);
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      {n >= 3 && [0.25, 0.5, 0.75, 1].map((f) => (
        <path key={f} d={ring(f)} fill="none" stroke="var(--rule)" strokeWidth="1" />
      ))}
      {n >= 3 && points.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth="1" />;
      })}
      {n >= 3
        ? <path d={dataPath} fill="var(--accent)" fillOpacity=".22"
                stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        : <text x={cx} y={cy} textAnchor="middle" fontSize="13"
                fill="var(--ink-3)">Servono almeno 3 dati per il radar.</text>}
      {n >= 3 && points.map((p, i) => {
        const [x, y] = pt(i, (Math.max(0, p.value) / max) * r);
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--paper-3)"
                       stroke="var(--accent)" strokeWidth="1.6" />;
      })}
      {points.map((p, i) => {
        const [lx, ly] = pt(i, r + 17);
        const c = Math.cos(angleAt(i));
        const anchor = Math.abs(c) < 0.3 ? 'middle' : (c > 0 ? 'start' : 'end');
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
                fontSize="11" fill="var(--ink-3)">{p.label}</text>
        );
      })}
    </svg>
  );
}

function ChartSvg({ type, data }) {
  const points = data.map((d) => ({ label: d.label || '—', value: Number(d.value) || 0 }));
  if (points.length === 0) {
    return <div className="chart-empty">Aggiungi dei dati per disegnare il grafico.</div>;
  }
  if (type === 'hbar') return <HBarChart points={points} />;
  if (type === 'line') return <LineChart points={points} />;
  if (type === 'area') return <AreaChart points={points} />;
  if (type === 'pie') return <PieChart points={points} />;
  if (type === 'radar') return <RadarChart points={points} />;
  return <BarChart points={points} />;
}

const CHART_TYPES = [
  ['bar', 'Barre'],
  ['hbar', 'Orizz.'],
  ['line', 'Linee'],
  ['area', 'Area'],
  ['pie', 'Torta'],
  ['radar', 'Radar'],
];

export function ChartBlock({ block, onChange }) {
  const data = block.data || [];
  const setData = (next) => onChange({ ...block, data: next });
  const setPoint = (i, key, v) => setData(data.map((d, j) => (j === i ? { ...d, [key]: v } : d)));
  const addPoint = () => setData([...data, { label: 'Nuovo', value: 0 }]);
  const delPoint = (i) => setData(data.filter((_, j) => j !== i));

  return (
    <div className="chart-block">
      <div className="chart-canvas">
        <ChartSvg type={block.chartType} data={data} />
      </div>
      <div className="chart-controls">
        <div className="seg-toggle">
          {CHART_TYPES.map(([t, label]) => (
            <button key={t} type="button" className={block.chartType === t ? 'is-on' : ''}
                    onClick={() => onChange({ ...block, chartType: t })}>
              {label}
            </button>
          ))}
        </div>
        <div className="chart-rows">
          {data.map((d, i) => (
            <div key={i} className="chart-row">
              <input className="cell-input" value={d.label} placeholder="Etichetta"
                     onChange={(e) => setPoint(i, 'label', e.target.value)} />
              <input className="cell-input chart-value" type="number" value={d.value}
                     placeholder="0" onChange={(e) => setPoint(i, 'value', e.target.value)} />
              <button type="button" className="row-action" title="Elimina dato"
                      onClick={() => delPoint(i)}>{xIcon}</button>
            </div>
          ))}
        </div>
        <button type="button" className="table-add-row" onClick={addPoint}>{plusIcon} Dato</button>
      </div>
    </div>
  );
}
