// Tiny dependency-free SVG chart helpers. Not a charting library — just
// enough geometry for bar / line / radar so dashboards show real data
// instead of decorative numbers.
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function barChart(data, { width = 480, height = 220, color = '#2952e3', valueFmt = (v) => v } = {}) {
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'svg-chart', width: '100%', height });
  if (!data.length) return svg;
  const max = Math.max(1, ...data.map((d) => d.value));
  const padL = 34, padB = 26, padT = 10;
  const chartW = width - padL - 10;
  const chartH = height - padB - padT;
  const barW = chartW / data.length - 10;
  data.forEach((d, i) => {
    const barH = (Math.abs(d.value) / max) * chartH;
    const x = padL + i * (chartW / data.length) + 5;
    const y = padT + (chartH - barH);
    const rect = svgEl('rect', { x, y, width: Math.max(barW, 4), height: Math.max(barH, 0), fill: d.color || color, rx: 3 });
    if (d.onClick) { rect.style.cursor = 'pointer'; rect.addEventListener('click', d.onClick); }
    svg.appendChild(rect);
    const labelEl = svgEl('text', { x: x + barW / 2, y: height - padB + 14, 'text-anchor': 'middle' });
    labelEl.textContent = d.label;
    if (d.onClick) { labelEl.style.cursor = 'pointer'; labelEl.addEventListener('click', d.onClick); }
    svg.appendChild(labelEl);
    const t = svgEl('text', { x: x + barW / 2, y: y - 4, 'text-anchor': 'middle' });
    t.textContent = valueFmt(d.value);
    svg.appendChild(t);
  });
  svg.appendChild(svgEl('line', { x1: padL, y1: padT + chartH, x2: width - 10, y2: padT + chartH, stroke: 'currentColor', 'stroke-opacity': 0.15 }));
  return svg;
}

export function lineChart(series, { width = 480, height = 220, color = '#2952e3' } = {}) {
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'svg-chart', width: '100%', height });
  if (!series.length) return svg;
  const max = Math.max(1, ...series.map((d) => d.value));
  const min = Math.min(0, ...series.map((d) => d.value));
  const padL = 40, padB = 24, padT = 10, padR = 10;
  const chartW = width - padL - padR;
  const chartH = height - padB - padT;
  const stepX = series.length > 1 ? chartW / (series.length - 1) : 0;
  const pts = series.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + chartH - ((d.value - min) / (max - min || 1)) * chartH;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  svg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 2.5 }));
  pts.forEach((p, i) => {
    svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 3.5, fill: color }));
    svg.appendChild(svgEl('text', { x: p[0], y: height - padB + 14, 'text-anchor': 'middle' })).textContent = series[i].label;
  });
  return svg;
}

export function radarChart(axes, { width = 320, height = 320, color = '#2952e3', max = 100 } = {}) {
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'svg-chart', width: '100%', height });
  const cx = width / 2, cy = height / 2, r = Math.min(width, height) / 2 - 34;
  const n = axes.length;
  if (n < 3) return svg;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  [0.25, 0.5, 0.75, 1].forEach((frac) => {
    const points = axes.map((_, i) => {
      const a = angleFor(i);
      return `${cx + Math.cos(a) * r * frac},${cy + Math.sin(a) * r * frac}`;
    }).join(' ');
    svg.appendChild(svgEl('polygon', { points, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.12 }));
  });

  axes.forEach((ax, i) => {
    const a = angleFor(i);
    const x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
    svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2, y2, stroke: 'currentColor', 'stroke-opacity': 0.12 }));
    const lx = cx + Math.cos(a) * (r + 20), ly = cy + Math.sin(a) * (r + 20);
    const t = svgEl('text', { x: lx, y: ly, 'text-anchor': 'middle' });
    t.textContent = ax.label;
    svg.appendChild(t);
  });

  const points = axes.map((ax, i) => {
    const a = angleFor(i);
    const frac = Math.max(0, Math.min(1, ax.value / max));
    return `${cx + Math.cos(a) * r * frac},${cy + Math.sin(a) * r * frac}`;
  }).join(' ');
  svg.appendChild(svgEl('polygon', { points, fill: color, 'fill-opacity': 0.22, stroke: color, 'stroke-width': 2 }));
  return svg;
}
