#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ELK = require('elkjs');

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('Usage: node scripts/render-scene-elk.js <scene.json> <output.svg>');
  process.exit(1);
}

const scene = JSON.parse(fs.readFileSync(input, 'utf8'));
const elk = new ELK();

const theme = {
  paper: '#f4efe6', ink: '#1d1b19', muted: '#6f675f', mist: '#dde5ef',
  sand: '#eadcc7', moss: '#dce8dc', path: '#7f756a',
  regionFill: 'rgba(210, 192, 170, 0.11)', regionStroke: 'rgba(124, 105, 85, 0.18)',
  noteFill: 'rgba(255, 252, 245, 0.94)'
};

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) current = candidate;
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function nodeStyle(kind) {
  // Instead of filling a box, we'll return a brush-like stroke color
  switch (kind) {
    case 'figure': return theme.sand;
    case 'concept': return '#c4d4e6'; // slightly deeper mist
    case 'project': return '#c6dbc6'; // slightly deeper moss
    case 'question': return '#e6c8c8';
    case 'claim': return '#dfccee';
    case 'symptom': return '#e3cdbe';
    default: return '#e6ddd0';
  }
}

// Helper to draw a rounded orthogonal path
function drawRoundedPath(points, radius = 16) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y} `;
  
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    // Distance to previous and next points
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    // Limit radius so it doesn't exceed half the shortest segment
    const r = Math.min(radius, d01 / 2, d12 / 2);

    // Vector from p1 towards p0
    const vx1 = (p0.x - p1.x) / d01;
    const vy1 = (p0.y - p1.y) / d01;
    
    // Vector from p1 towards p2
    const vx2 = (p2.x - p1.x) / d12;
    const vy2 = (p2.y - p1.y) / d12;

    // Start and end of the curve
    const cx1 = p1.x + vx1 * r;
    const cy1 = p1.y + vy1 * r;
    const cx2 = p1.x + vx2 * r;
    const cy2 = p1.y + vy2 * r;

    // Draw line to the start of the curve, then quadratic bezier to the end of the curve
    d += `L ${cx1} ${cy1} Q ${p1.x} ${p1.y}, ${cx2} ${cy2} `;
  }
  
  d += `L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}
const nodesById = {};
const elkNodes = [];
scene.nodes.forEach(node => {
  const hasSummary = !!node.summary;
  const width = hasSummary ? 230 : 190;
  const height = hasSummary ? 92 : 58;
  const elkNode = { id: node.id, width, height, layoutOptions: { 'elk.portConstraints': 'FREE' } };
  nodesById[node.id] = { ...node, width, height };
  elkNodes.push(elkNode);
});

const elkEdges = (scene.edges || []).map((edge, i) => ({
  id: `e${i}`,
  sources: [edge.from],
  targets: [edge.to],
  labels: edge.label ? [{ text: edge.label, width: edge.label.length * 6, height: 14 }] : []
}));

const graph = {
  id: "root",
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '40',
    'elk.layered.spacing.nodeNodeBetweenLayers': '90',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
    'elk.alignment': 'CENTER'
  },
  children: elkNodes,
  edges: elkEdges
};

elk.layout(graph).then(layoutedGraph => {
  let maxX = 0;
  let maxY = 0;
  
  const positionedNodes = {};
  layoutedGraph.children.forEach(n => {
    positionedNodes[n.id] = n;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  // Center offset
  const offsetX = 100;
  const offsetY = 140; // Room for title

  const svgWidth = Math.max(1160, maxX + offsetX * 2);
  const svgHeight = Math.max(640, maxY + offsetY + 150);

  const svgParts = [];
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8f3ea" />
      <stop offset="100%" stop-color="${theme.paper}" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#bg)" />
  <rect x="20" y="18" width="${svgWidth - 40}" height="72" rx="18" fill="rgba(255,255,255,0.58)" stroke="rgba(96,74,49,0.08)" />
  <text x="40" y="52" font-family="Avenir Next, Segoe UI, sans-serif" font-size="28" font-weight="700" fill="${theme.ink}">${esc(scene.title)}</text>
  <text x="40" y="76" font-family="Avenir Next, Segoe UI, sans-serif" font-size="14" fill="${theme.muted}">${esc(scene.subtitle || '')}</text>
`);

  // Draw Groups (Calculating bounding boxes manually since we used a flat ELK graph for simplicity)
  (scene.groups || []).forEach(group => {
    let minX = Infinity, minY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    group.members.forEach(id => {
      const n = positionedNodes[id];
      if (n) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + n.width > gMaxX) gMaxX = n.x + n.width;
        if (n.y + n.height > gMaxY) gMaxY = n.y + n.height;
      }
    });
    if (minX !== Infinity) {
      const pad = 24;
      const x = minX + offsetX - pad;
      const y = minY + offsetY - pad;
      const w = (gMaxX - minX) + pad * 2;
      const h = (gMaxY - minY) + pad * 2;
      svgParts.push(`
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="${theme.regionFill}" stroke="${theme.regionStroke}" />
        <text x="${x + 14}" y="${y - 10}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="12" font-weight="700" letter-spacing="0.08em" text-transform="uppercase" fill="${theme.muted}">${esc(group.label)}</text>
      `);
    }
  });

  // Draw Edges
  layoutedGraph.edges.forEach((edge, idx) => {
    if (edge.sections && edge.sections.length > 0) {
      const section = edge.sections[0];
      const pts = [
        { x: section.startPoint.x + offsetX, y: section.startPoint.y + offsetY },
        ...(section.bendPoints || []).map(bp => ({ x: bp.x + offsetX, y: bp.y + offsetY })),
        { x: section.endPoint.x + offsetX, y: section.endPoint.y + offsetY }
      ];
      
      const pathD = drawRoundedPath(pts, 24); // 24px corner radius
      
      svgParts.push(`<path d="${pathD}" fill="none" stroke="${theme.path}" stroke-width="1.9" opacity="0.88" />`);
      
      if (edge.labels && edge.labels.length > 0) {
        const l = edge.labels[0];
        const lx = l.x + offsetX + l.width/2;
        const ly = l.y + offsetY + l.height/2;
        svgParts.push(`
          <rect x="${lx - l.width/2 - 8}" y="${ly - 11}" width="${l.width + 16}" height="18" rx="9" fill="${theme.paper}" opacity="0.96" />
          <text x="${lx}" y="${ly + 3}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="10" font-weight="600" fill="${theme.muted}">${esc(l.text)}</text>
        `);
      }
    }
  });

  // Draw Nodes
  layoutedGraph.children.forEach(n => {
    const originalNode = nodesById[n.id];
    const bx = n.x + offsetX;
    const by = n.y + offsetY;
    const summaryLines = originalNode.summary ? wrapText(originalNode.summary, 28).slice(0, 2) : [];
    
    // Calculate a rough width for the text to make the brush stroke fit the label
    const textWidth = Math.min(n.width - 10, originalNode.label.length * 12);
    const brushWidth = textWidth + 32;
    const brushStartX = bx + n.width/2 - brushWidth/2;
    
    svgParts.push(`
      <g>
        <!-- The brush stroke highlight -->
        <path d="M ${brushStartX} ${by + 34} Q ${bx + n.width/2} ${by + 37} ${brushStartX + brushWidth} ${by + 32}" 
              fill="none" stroke="${nodeStyle(originalNode.kind)}" stroke-width="22" stroke-linecap="round" opacity="0.8" />
        
        <text x="${bx + n.width/2}" y="${by + 14}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="10" font-weight="700" letter-spacing="0.09em" fill="${theme.muted}">${esc(originalNode.kind || '').toUpperCase()}</text>
        <text x="${bx + n.width/2}" y="${by + 41}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="20" font-weight="700" fill="${theme.ink}">${esc(originalNode.label)}</text>
        ${summaryLines.map((line, i) => `<text x="${bx + n.width/2}" y="${by + 66 + i*17}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="14" fill="#544c45">${esc(line)}</text>`).join('')}
      </g>
    `);
  });

  // Draw Annotations at the bottom
  if (scene.annotations && scene.annotations.length > 0) {
    const annY = Math.max(maxY + offsetY + 60, svgHeight - 60);
    scene.annotations.forEach(a => {
      svgParts.push(`
        <rect x="${svgWidth/2 - 255}" y="${annY - 18}" width="510" height="36" rx="12" fill="${theme.noteFill}" stroke="rgba(96,74,49,0.06)" />
        <text x="${svgWidth/2}" y="${annY + 5}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="14" fill="${theme.ink}">${esc(a.text)}</text>
      `);
    });
  }

  svgParts.push('</svg>');

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, svgParts.join('\n'));
  console.log(`Wrote ${output}`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
