import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Builds a smoothed path (simple Catmull-Rom -> cubic Bezier conversion)
// instead of straight polyline segments, purely a visual upgrade -- the
// underlying points are unchanged.
function smoothPath(points) {
  if (points.length < 3) return `M${points.map((p) => p.join(",")).join(" L")}`;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Minimal dependency-free line chart. Each series is normalized to its own
// 0-1 range so cost (dollars) and leads (small counts) can share one chart
// without one line flattening the other.
export default function TrendChart({ data, series }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 300;
  const padding = 40;
  const innerW = width - padding * 2;

  const ranges = series.map((s) => {
    const values = data.map((d) => d[s.key]);
    return { max: Math.max(...values, 1), min: Math.min(0, ...values) };
  });

  const xAt = (i) => padding + (i / Math.max(data.length - 1, 1)) * innerW;
  const yAt = (v, key) => {
    const idx = series.findIndex((s) => s.key === key);
    const { max, min } = ranges[idx];
    const range = max - min || 1;
    return height - padding - ((v - min) / range) * (height - padding * 2);
  };

  const seriesPoints = series.map((s) => data.map((d, i) => [xAt(i), yAt(d[s.key], s.key)]));

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = (x - padding) / innerW;
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
    
    // Track mouse position for tooltip positioning
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  // Calculate tooltip position with edge detection
  const getTooltipPosition = () => {
    if (!hovered) return { left: 0, top: 0, transform: 'translate(-50%, -100%)' };
    
    const tooltipWidth = 200;
    const tooltipHeight = 150;
    const margin = 10;
    
    let x = mousePos.x;
    let y = mousePos.y;
    let transform = 'translate(-50%, -100%)';
    
    // Check right edge
    if (x + tooltipWidth / 2 > window.innerWidth - margin) {
      transform = 'translate(-100%, -100%)';
    }
    // Check left edge
    else if (x - tooltipWidth / 2 < margin) {
      transform = 'translate(0%, -100%)';
    }
    
    // Check top edge
    if (y - tooltipHeight < margin) {
      transform = transform.replace('-100%', '10%');
    }
    
    return { left: x, top: y, transform };
  };

  const tooltipPosition = getTooltipPosition();

  const chart = (
    <div style={{ position: "relative", background: "var(--surface)", borderRadius: "var(--radius)", padding: "16px", border: "1px solid var(--border)" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient id={`trend-grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line 
            key={f} 
            x1={padding} 
            y1={padding + f * (height - padding * 2)} 
            x2={width - padding} 
            y2={padding + f * (height - padding * 2)} 
            stroke="var(--border)" 
            strokeWidth="1"
            strokeDasharray={f === 0 || f === 1 ? "0" : "4,4"} 
          />
        ))}

        {series.map((s, si) => {
          const pts = seriesPoints[si];
          const path = smoothPath(pts);
          const areaPath = `${path} L${pts[pts.length - 1][0].toFixed(1)},${height - padding} L${pts[0][0].toFixed(1)},${height - padding} Z`;
          return (
            <g key={s.key}>
              <path d={areaPath} fill={`url(#trend-grad-${s.key})`} stroke="none" />
              <path d={path} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* hover indicator */}
        {hoverIdx !== null && (
          <>
            <line 
              x1={xAt(hoverIdx)} 
              y1={padding} 
              x2={xAt(hoverIdx)} 
              y2={height - padding} 
              stroke="var(--border-strong)" 
              strokeWidth="1.5"
              strokeDasharray="4,4" 
            />
            {series.map((s, si) => (
              <circle 
                key={s.key} 
                cx={seriesPoints[si][hoverIdx][0]} 
                cy={seriesPoints[si][hoverIdx][1]} 
                r="5" 
                fill={s.color} 
                stroke="var(--surface)" 
                strokeWidth="2.5" 
              />
            ))}
          </>
        )}

        {/* x-axis labels: first, middle, last date */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text 
            key={i} 
            x={xAt(i)} 
            y={height - 12} 
            fontSize="11" 
            fill="var(--text-muted)" 
            textAnchor="middle"
            fontWeight="500"
          >
            {data[i]?.date?.slice(5)}
          </text>
        ))}

        {/* legend */}
        <g transform={`translate(${padding}, 16)`}>
          {series.map((s, i) => (
            <g key={s.key} transform={`translate(${i * 120}, 0)`}>
              <rect width="12" height="12" fill={s.color} rx="3" />
              <text x="18" y="10" fontSize="12" fill="var(--text)" fontWeight="600">{s.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );

  // Render tooltip via portal to document.body to escape parent container constraints
  const tooltip = hovered ? createPortal(
    <div 
      className="chart-tooltip" 
      style={{
        position: "fixed",
        left: `${tooltipPosition.left}px`,
        top: `${tooltipPosition.top}px`,
        transform: tooltipPosition.transform,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minWidth: "150px",
        maxWidth: "200px",
        zIndex: 9999,
        pointerEvents: "none",
        wordWrap: "break-word"
      }}
    >
      <div className="t-date" style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "var(--text-muted)" }}>
        {hovered.date}
      </div>
      {series.map((s) => (
        <div className="t-row" key={s.key} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
          <span className="t-dot" style={{ background: s.color, width: "8px", height: "8px", borderRadius: "50%", marginRight: "8px" }} />
          <span style={{ fontSize: "13px", color: "var(--text-muted)", marginRight: "8px" }}>{s.label}:</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
            {typeof hovered[s.key] === "number" ? hovered[s.key].toLocaleString(undefined, { maximumFractionDigits: 2 }) : hovered[s.key]}
          </span>
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {chart}
      {tooltip}
    </>
  );
}
