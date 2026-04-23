#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const d3 = require('d3-force');

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) process.exit(1);

const scene = JSON.parse(fs.readFileSync(input, 'utf8'));

// Theme
const theme = {
  paper: '#f4efe6', ink: '#1d1b19', muted: '#6f675f', mist: '#dde5ef',
  sand: '#eadcc7', moss: '#dce8dc', path: '#7f756a', noteFill: 'rgba(255, 252, 245, 0.94)',
  regionFill: 'rgba(210, 192, 170, 0.11)', regionStroke: 'rgba(124, 105, 85, 0.18)'
};

function nodeStyle(kind) {
  switch (kind) {
    case 'figure': return theme.sand;
    case 'concept': return '#c4d4e6'; 
    case 'project': return '#c6dbc6'; 
    case 'question': return '#e6c8c8';
    case 'claim': return '#dfccee';
    case 'symptom': return '#e3cdbe';
    default: return '#e6ddd0';
  }
}

function esc(s='') { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).length <= maxChars) current = current ? current + ' ' + word : word;
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

const nodesById = {};
const nodes = scene.nodes.map(n => {
  const clone = { ...n, inEdges: [], outEdges: [], layer: 0 };
  nodesById[n.id] = clone;
  return clone;
});

const links = (scene.edges || []).map(e => {
  const link = { source: e.from, target: e.to, label: e.label, kind: e.kind };
  if(nodesById[e.from] && nodesById[e.to]) {
    nodesById[e.from].outEdges.push(link);
    nodesById[e.to].inEdges.push(link);
  }
  return link;
});

// 1. Assign Layers (Topological sort avoiding back-edges)
function assignLayer(nodeId, depth, visited) {
  let n = nodesById[nodeId];
  if (!n) return;
  if (depth > n.layer) n.layer = depth;
  visited.add(nodeId);
  n.outEdges.forEach(e => {
    if (!visited.has(e.target)) {
      assignLayer(e.target, depth + 1, new Set(visited));
    } else {
      e.isBackEdge = true; // Mark return loops
    }
  });
}
let roots = nodes.filter(n => n.inEdges.length === 0);
if (roots.length === 0) roots = [nodes[0]];
roots.forEach(r => assignLayer(r.id, 0, new Set()));

// Base dimensions
const width = 1200;
let maxLayer = Math.max(...nodes.map(n => n.layer));
const layerHeight = 140;
const offsetY = 180;
const height = Math.max(800, maxLayer * layerHeight + offsetY + 200);

// 2. Hybrid Physics: Force X, Lock Y
const simulation = d3.forceSimulation(nodes)
  // Pull connected nodes together horizontally
  .force("link", d3.forceLink(links).id(d => d.id).distance(40).strength(0.2))
  // Keep nodes from overlapping horizontally
  .force("collide", d3.forceCollide().radius(140).iterations(3).strength(1))
  // Keep things centered
  .force("x", d3.forceX(width / 2).strength(0.08))
  .on("tick", () => {
    // LOCK Y COORDINATES strictly to their semantic layer
    nodes.forEach(n => {
      n.y = offsetY + n.layer * layerHeight;
    });
  });

simulation.stop();
for (let i = 0; i < 300; ++i) simulation.tick();

// 3. Render SVG
const svgParts = [];
svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8f3ea" /><stop offset="100%" stop-color="${theme.paper}" /></linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="20" y="18" width="${width - 40}" height="72" rx="18" fill="rgba(255,255,255,0.58)" stroke="rgba(96,74,49,0.08)" />
  <text x="40" y="52" font-family="Avenir Next, Segoe UI, sans-serif" font-size="28" font-weight="700" fill="${theme.ink}">${esc(scene.title)}</text>
  <text x="40" y="76" font-family="Avenir Next, Segoe UI, sans-serif" font-size="14" fill="${theme.muted}">${esc(scene.subtitle || '')}</text>
`);

// Groups
(scene.groups || []).forEach(group => {
  let minX = Infinity, minY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
  group.members.forEach(id => {
    const n = nodesById[id];
    if (n) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > gMaxX) gMaxX = n.x;
      if (n.y > gMaxY) gMaxY = n.y;
    }
  });
  if (minX !== Infinity) {
    const padX = 140, padY = 50;
    svgParts.push(`
      <rect x="${minX - padX}" y="${minY - padY}" width="${(gMaxX - minX) + padX*2}" height="${(gMaxY - minY) + padY*2}" rx="40" fill="${theme.regionFill}" stroke="${theme.regionStroke}" stroke-width="2" stroke-dasharray="10 6" />
      <text x="${minX - padX + 24}" y="${minY - padY + 24}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="13" font-weight="700" letter-spacing="0.08em" text-transform="uppercase" fill="${theme.muted}">${esc(group.label)}</text>
    `);
  }
});

// Edges
links.forEach(l => {
  const s = l.source, t = l.target;
  let pathD, mx, my;
  
  if (l.isBackEdge || t.y <= s.y) {
    // Draw a swooping curve way out to the left for back-edges so they don't cross the middle
    const arcX = Math.min(s.x, t.x) - 350;
    pathD = `M ${s.x - 20} ${s.y} C ${arcX} ${s.y}, ${arcX} ${t.y}, ${t.x - 20} ${t.y}`;
    mx = (s.x + t.x)/2 - 180;
    my = (s.y + t.y)/2;
  } else {
    // Standard vertical S-curve
    pathD = `M ${s.x} ${s.y + 20} C ${s.x} ${(s.y + t.y)/2}, ${t.x} ${(s.y + t.y)/2}, ${t.x} ${t.y - 20}`;
    mx = (s.x + t.x)/2;
    my = (s.y + t.y)/2;
  }

  svgParts.push(`<path d="${pathD}" fill="none" stroke="${theme.path}" stroke-width="2.2" opacity="0.6" />`);
  if (l.label) {
    svgParts.push(`
      <rect x="${mx - 40}" y="${my - 12}" width="80" height="24" rx="12" fill="${theme.paper}" opacity="0.9" />
      <text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="11" font-weight="600" fill="${theme.muted}">${esc(l.label)}</text>
    `);
  }
});

// Nodes (Brush style)
nodes.forEach(n => {
  const textWidth = Math.min(220, n.label.length * 11);
  const brushWidth = textWidth + 40;
  const bx = n.x - brushWidth/2;
  const summaryLines = n.summary ? wrapText(n.summary, 32).slice(0, 2) : [];
  
  svgParts.push(`
    <g>
      <path d="M ${bx} ${n.y + 14} Q ${n.x} ${n.y + 17} ${bx + brushWidth} ${n.y + 12}" fill="none" stroke="${nodeStyle(n.kind)}" stroke-width="26" stroke-linecap="round" opacity="0.85" />
      <text x="${n.x}" y="${n.y - 8}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="10" font-weight="700" letter-spacing="0.1em" fill="${theme.muted}">${esc(n.kind).toUpperCase()}</text>
      <text x="${n.x}" y="${n.y + 20}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="20" font-weight="700" fill="${theme.ink}">${esc(n.label)}</text>
      ${summaryLines.map((line, i) => `<text x="${n.x}" y="${n.y + 44 + i*16}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="14" fill="#544c45">${esc(line)}</text>`).join('')}
    </g>
  `);
});

// Annotations
if (scene.annotations) {
  const annY = height - 60;
  scene.annotations.forEach(a => {
    svgParts.push(`
      <rect x="${width/2 - 300}" y="${annY - 20}" width="600" height="40" rx="12" fill="${theme.noteFill}" stroke="rgba(96,74,49,0.06)" />
      <text x="${width/2}" y="${annY + 5}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="15" fill="${theme.ink}">${esc(a.text)}</text>
    `);
  });
}

svgParts.push('</svg>');

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, svgParts.join('\n'));
console.log(`Wrote ${output}`);
