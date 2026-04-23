#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dagre = require('dagre');

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('Usage: node scripts/render-scene-dagre.js <scene.json> <output.svg>');
  process.exit(1);
}

const scene = JSON.parse(fs.readFileSync(input, 'utf8'));

// Initialize a new directed graph
const g = new dagre.graphlib.Graph({ compound: true });
g.setGraph({
  rankdir: 'TB', // Top-to-Bottom
  nodesep: 60,   // Horizontal spacing
  ranksep: 80,   // Vertical spacing
  marginx: 60,
  marginy: 120   // Leave room for title
});
g.setDefaultEdgeLabel(() => ({}));

// Theme and helpers
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
  switch (kind) {
    case 'figure': return theme.sand;
    case 'concept': return theme.mist;
    case 'project': return theme.moss;
    case 'question': return '#f3dddd';
    case 'claim': return '#ece2f3';
    case 'symptom': return '#f0dfd4';
    default: return '#f3eee5';
  }
}

// 1. Add nodes to Dagre
scene.nodes.forEach(node => {
  const hasSummary = !!node.summary;
  const width = hasSummary ? 230 : 190;
  const height = hasSummary ? 92 : 58;
  g.setNode(node.id, { width, height, data: node });
});

// 2. Add edges to Dagre
(scene.edges || []).forEach(edge => {
  g.setEdge(edge.from, edge.to, { data: edge });
});

// 3. Add compound groups to Dagre (if needed, though standard layout might be enough first)
(scene.groups || []).forEach(group => {
  g.setNode(group.id, { label: group.label, clusterLabelPos: 'top' });
  group.members.forEach(memberId => {
    if (g.hasNode(memberId)) {
      g.setParent(memberId, group.id);
    }
  });
});

// Calculate Layout
dagre.layout(g);

// Determine bounding box
let maxX = 0;
let maxY = 0;
g.nodes().forEach(v => {
  const node = g.node(v);
  if (node.x + node.width / 2 > maxX) maxX = node.x + node.width / 2;
  if (node.y + node.height / 2 > maxY) maxY = node.y + node.height / 2;
});

const svgWidth = Math.max(1160, maxX + 100);
const svgHeight = Math.max(640, maxY + 200); // Leave room for annotations at bottom

// Generate SVG
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

// Draw Groups (Clusters)
g.nodes().forEach(v => {
  const node = g.node(v);
  if (node.clusterLabelPos) { // It's a group
    const w = node.width + 40;
    const h = node.height + 40;
    const x = node.x - w/2;
    const y = node.y - h/2;
    svgParts.push(`
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="${theme.regionFill}" stroke="${theme.regionStroke}" />
      <text x="${x + 14}" y="${y - 10}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="12" font-weight="700" letter-spacing="0.08em" text-transform="uppercase" fill="${theme.muted}">${esc(node.label)}</text>
    `);
  }
});

// Draw Edges
g.edges().forEach(e => {
  const edge = g.edge(e);
  // Dagre gives us points for the edge routing
  if (edge.points && edge.points.length > 1) {
    const pts = edge.points;
    // Simple polyline for now, or bezier
    const pathD = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    
    svgParts.push(`<path d="${pathD}" fill="none" stroke="${theme.path}" stroke-width="1.9" opacity="0.88" />`);
    
    if (edge.data && edge.data.label) {
      // Find middle point roughly
      const mid = Math.floor(pts.length / 2);
      const mx = pts[mid].x;
      const my = pts[mid].y;
      svgParts.push(`
        <rect x="${mx - 38}" y="${my - 11}" width="76" height="18" rx="9" fill="${theme.paper}" opacity="0.96" />
        <text x="${mx}" y="${my + 3}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="10" font-weight="600" fill="${theme.muted}">${esc(edge.data.label)}</text>
      `);
    }
  }
});

// Draw Nodes
g.nodes().forEach(v => {
  const n = g.node(v);
  if (!n.data) return; // Skip clusters here
  const node = n.data;
  const b = { x: n.x - n.width/2, y: n.y - n.height/2, w: n.width, h: n.height };
  const summaryLines = node.summary ? wrapText(node.summary, 28).slice(0, 2) : [];
  
  svgParts.push(`
    <g>
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="18" fill="${nodeStyle(node.kind)}" stroke="rgba(65,49,34,0.08)" />
      <text x="${b.x + 16}" y="${b.y + 18}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="9" font-weight="700" letter-spacing="0.09em" fill="${theme.muted}">${esc(node.kind || '').toUpperCase()}</text>
      <text x="${b.x + 16}" y="${b.y + 40}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="15" font-weight="700" fill="${theme.ink}">${esc(node.label)}</text>
      ${summaryLines.map((line, i) => `<text x="${b.x + 16}" y="${b.y + 61 + i*15}" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="12" fill="#544c45">${esc(line)}</text>`).join('')}
    </g>
  `);
});

// Draw Annotations at the bottom
if (scene.annotations && scene.annotations.length > 0) {
  const annY = Math.max(maxY + 60, svgHeight - 60);
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
