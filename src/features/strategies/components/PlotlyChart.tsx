import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout } from 'plotly.js';

// react-plotly.js ships CommonJS; depending on the bundler the factory is on `.default`.
const factory = ((createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }).default ??
  createPlotlyComponent) as typeof createPlotlyComponent;
const Plot = factory(Plotly);

export interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  height?: number;
}

/** Loaded lazily (see charts.tsx) so Plotly stays out of the initial bundle. */
export default function PlotlyChart({ data, layout, height = 260 }: PlotlyChartProps) {
  return (
    <Plot
      data={data}
      layout={{
        autosize: true,
        height,
        margin: { l: 56, r: 12, t: 8, b: 30 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { size: 11, color: '#656d76' },
        xaxis: { gridcolor: '#eaeef2', linecolor: '#d0d7de' },
        yaxis: { gridcolor: '#eaeef2', linecolor: '#d0d7de', zeroline: false },
        legend: { orientation: 'h', y: 1.12, x: 0 },
        hovermode: 'x unified',
        ...layout,
      }}
      config={{ displayModeBar: false, responsive: true }}
      useResizeHandler
      style={{ width: '100%', height }}
    />
  );
}
