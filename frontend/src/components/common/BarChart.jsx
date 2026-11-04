import React, { useRef, useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import { useApp } from '../../context/useApp';

export default function BarChart({ data = [], height = 200, color, fmtAxis }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(320);
  const { showTip, hideTip } = useApp();

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const measured = Math.max(240, Math.round(containerRef.current.clientWidth || 320));
        setWidth(measured);
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!data.length) {
    return (
      <div ref={containerRef}>
        <EmptyState
          icon="fa-chart-column"
          title="No data yet"
          text="This chart fills in as activity happens."
        />
      </div>
    );
  }

  const W = width;
  const H = height;
  const padL = 44, padR = 6, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = plotW / data.length;
  const barW = Math.max(4, Math.min(bw * 0.6, 34));

  const gridFractions = [0, 0.5, 1];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        width="100%"
        height={H}
      >
        {/* Grid and Axis Lines */}
        {gridFractions.map(f => {
          const y = Math.round(padT + plotH * (1 - f)) + 0.5;
          const isBaseline = f === 0;
          return (
            <React.Fragment key={f}>
              <line
                className={isBaseline ? 'axis-line' : 'grid-line'}
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
              />
              <text
                className="tick"
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
              >
                {fmtAxis ? fmtAxis(max * f) : Math.round(max * f)}
              </text>
            </React.Fragment>
          );
        })}

        {/* Bars and Hitboxes */}
        {data.map((d, i) => {
          const h = plotH * (d.value / max);
          const x = padL + bw * i + (bw - barW) / 2;
          const y = padT + plotH - h;
          const tipText = d.tip || `${d.label}: ${d.value}`;

          return (
            <g
              key={i}
              className="col"
              onPointerEnter={e => showTip(tipText, e.clientX, e.clientY)}
              onPointerMove={e => showTip(tipText, e.clientX, e.clientY)}
              onPointerLeave={hideTip}
            >
              <rect
                className="bar"
                x={x.toFixed(1)}
                y={(d.value ? y : padT + plotH - 2).toFixed(1)}
                width={barW.toFixed(1)}
                height={(d.value ? Math.max(h, 2) : 2).toFixed(1)}
                rx="3"
                style={color ? { fill: color } : undefined}
                opacity={d.value ? undefined : 0.25}
              />
              <rect
                className="bar-hit"
                x={(padL + bw * i).toFixed(1)}
                y={padT}
                width={bw.toFixed(1)}
                height={plotH}
              />
              {d.label && (
                <text
                  className="tick"
                  x={(padL + bw * i + bw / 2).toFixed(1)}
                  y={H - 7}
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

