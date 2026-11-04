import React from 'react';

export default function ChartTip({ tip }) {
  if (!tip || !tip.visible) return <div id="chart-tip" className="chart-tip"></div>;

  return (
    <div
      id="chart-tip"
      className="chart-tip on"
      style={{
        left: `${tip.x}px`,
        top: `${tip.y}px`
      }}
    >
      {tip.text}
    </div>
  );
}

