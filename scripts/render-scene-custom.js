#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) process.exit(1);

const scene = JSON.parse(fs.readFileSync(input, 'utf8'));

// Theme & Aesthetics
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

// Data prep
const nodesById = {};
const nodes = scene.nodes.map(n => {
  const textWidth = Math.min(220, n.label.length * 11);
  const brushWidth = textWidth + 40;
  const h = n.summary ? 80 : 40;
  const clone = { ...n, w: brushWidth, h, inEdges: [], outEdges: [], layer: 0 };
  nodesById[n.id] = clone;
  return clone;
});

const links = (scene.edges || []).map(e => {
  const link = { source: e.from, target: e.to, label: e.label };
  if(nodesById[e.from] && nodesById[e.to]) {
    nodesById[e.from].outEdges.push(link);
    nodesById[e.to].inEdges.push(link);
  }
  return link;
});

// Phase 1: Semantic Stratification (Assign Y)
function assignLayer(nodeId, depth, visited) {
  let n = nodesById[nodeId];
  if (!n) return;
  if (depth > n.layer) n.layer = depth;
  visited.add(nodeId);
  n.outEdges.forEach(e => {
    if (!visited.has(e.target)) {
      // Basic safeguard: don't let the depth increase past an arbitrary massive number just in case
      if (depth < 10) assignLayer(e.target, depth + 1, new Set(visited));
    } else {
      e.isBackEdge = true;
    }
  });
}
let roots = nodes.filter(n => n.inEdges.length === 0); // Removed the outEdges check so independent clusters don't break
if (roots.length === 0) roots = [nodes[0]];
roots.forEach(r => assignLayer(r.id, 0, new Set()));

// Group nodes by layer
const layers = [];
nodes.forEach(n => {
  if (!layers[n.layer]) layers[n.layer] = [];
  layers[n.layer].push(n);
});

// Layout Config
const startY = 180;
const layerGapY = 200; // Increased from 150 to give more vertical breathing room
const nodeGapX = 160;  // Increased from 120 to push nodes further apart horizontally
const canvasW = 1400;  // Expanded canvas width to accommodate wider spacing

  // Phase 2: Centrifugal Packing (Assign X)
layers.forEach((layerNodes, i) => {
  const y = startY + i * layerGapY;
  
  // Total width of all nodes + wider gaps
  const totalW = layerNodes.reduce((sum, n) => sum + n.w, 0) + (layerNodes.length - 1) * nodeGapX;
  
  // Start X to center the row
  let currentX = (canvasW / 2) - (totalW / 2);
  
  layerNodes.forEach(n => {
    // Determine cluster context to calculate repulsion (pushing nodes apart if they belong to different logical branches)
    let extraPadding = 0;
    
    // Add organic wobble (-3 to +3 px, reduced so it doesn't cause accidental overlaps)
    const wobbleX = (Math.random() - 0.5) * 6;
    const wobbleY = (Math.random() - 0.5) * 6;
    
    n.x = currentX + (n.w / 2) + wobbleX + extraPadding;
    n.y = y + wobbleY;
    
    currentX += n.w + nodeGapX + extraPadding;
  });
});

let maxLayer = Math.max(...nodes.map(n => n.layer));
const canvasH = Math.max(800, maxLayer * layerGapY + startY + 200);

// Phase 3 & 4: Render
const svgParts = [];
svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="100%" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8f3ea" /><stop offset="100%" stop-color="${theme.paper}" /></linearGradient>
  </defs>
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="url(#bg)" />
  <rect x="20" y="18" width="${canvasW - 40}" height="72" rx="18" fill="rgba(255,255,255,0.58)" stroke="rgba(96,74,49,0.08)" />
  <text x="40" y="52" font-family="Avenir Next, Segoe UI, sans-serif" font-size="28" font-weight="700" fill="${theme.ink}">${esc(scene.title)}</text>
  <text x="40" y="76" font-family="Avenir Next, Segoe UI, sans-serif" font-size="14" fill="${theme.muted}">${esc(scene.subtitle || '')}</text>
`);

// Groups
(scene.groups || []).forEach(group => {
  let minX = Infinity, minY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
  group.members.forEach(id => {
    const n = nodesById[id];
    if (n) {
      if (n.x - n.w/2 < minX) minX = n.x - n.w/2;
      if (n.y - n.h/2 < minY) minY = n.y - n.h/2;
      if (n.x + n.w/2 > gMaxX) gMaxX = n.x + n.w/2;
      if (n.y + n.h/2 > gMaxY) gMaxY = n.y + n.h/2;
    }
  });
  if (minX !== Infinity) {
    const padX = 40, padY = 40;
    // Wobble the region box slightly to make it feel drawn
    const wR = (Math.random() - 0.5) * 8;
    svgParts.push(`
      <rect x="${minX - padX}" y="${minY - padY}" width="${(gMaxX - minX) + padX*2}" height="${(gMaxY - minY) + padY*2}" rx="${30 + wR}" fill="${theme.regionFill}" stroke="${theme.regionStroke}" stroke-width="2" stroke-dasharray="12 8" />
      <text x="${minX - padX + 24}" y="${minY - padY + 24}" font-family="Avenir Next, Segoe UI, sans-serif" font-size="13" font-weight="700" letter-spacing="0.08em" text-transform="uppercase" fill="${theme.muted}">${esc(group.label)}</text>
    `);
  }
});

// Edges
links.forEach(l => {
  const s = nodesById[l.source], t = nodesById[l.target];
  if (!s || !t) return;
  
  let pathD, mx, my;
  
  if (l.isBackEdge || t.y <= s.y) {
    // Return loop: route out to the margins depending on where the target is
    const isLeft = t.x < canvasW / 2;
    const marginX = isLeft ? 120 : canvasW - 120;
    pathD = `M ${isLeft ? s.x - s.w/2 : s.x + s.w/2} ${s.y} C ${marginX} ${s.y}, ${marginX} ${t.y}, ${isLeft ? t.x - t.w/2 : t.x + t.w/2} ${t.y}`;
    mx = isLeft ? marginX + 40 : marginX - 40;
    my = (s.y + t.y)/2;
  } else {
    // Forward edge: smooth S-curve
    // Shift the control points slightly outward to prevent overlapping the text boxes below
    const curveIntensity = Math.abs(s.x - t.x) * 0.6; // Increased bend intensity to push curves further out
    pathD = `M ${s.x} ${s.y + 45} C ${s.x} ${(s.y + t.y)/2 + curveIntensity}, ${t.x} ${(s.y + t.y)/2 - curveIntensity}, ${t.x} ${t.y - 35}`;
    
    // Nudge the label up slightly if it's a steep diagonal to avoid hitting nodes
    mx = (s.x + t.x)/2;
    my = (s.y + t.y)/2 - (Math.abs(s.x - t.x) > 150 ? 25 : 0); // Increased vertical nudge for steep labels
  }

  // Draw the edge path
  svgParts.push(`<path d="${pathD}" fill="none" stroke="${theme.path}" stroke-width="2.2" opacity="0.6" />`);
  
  // Draw the edge label
  if (l.label) {
    // Determine the width of the label background based on text length
    const labelW = l.label.length * 7 + 20;
    svgParts.push(`
      <rect x="${mx - labelW/2}" y="${my - 12}" width="${labelW}" height="24" rx="12" fill="${theme.paper}" opacity="0.95" stroke="rgba(96,74,49,0.05)" />
      <text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="11" font-weight="600" fill="${theme.muted}">${esc(l.label)}</text>
    `);
  }
});

// Nodes
nodes.forEach(n => {
  const bx = n.x - n.w/2;
  const summaryLines = n.summary ? wrapText(n.summary, 32).slice(0, 2) : [];
  
  svgParts.push(`
    <g>
      <path d="M ${bx} ${n.y + 14} Q ${n.x} ${n.y + 17} ${bx + n.w} ${n.y + 12}" fill="none" stroke="${nodeStyle(n.kind)}" stroke-width="26" stroke-linecap="round" opacity="0.85" />
      <text x="${n.x}" y="${n.y - 8}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="10" font-weight="700" letter-spacing="0.1em" fill="${theme.muted}">${esc(n.kind).toUpperCase()}</text>
      <text x="${n.x}" y="${n.y + 20}" text-anchor="middle" font-family="Avenir Next, Segoe UI, sans-serif" font-size="20" font-weight="700" fill="${theme.ink}">${esc(n.label)}</text>
      ${summaryLines.map((line, i) => `<text x="${n.x}" y="${n.y + 44 + i*16}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="14" fill="#544c45">${esc(line)}</text>`).join('')}
    </g>
  `);
});

// Annotations
if (scene.annotations) {
  const annY = canvasH - 60;
  scene.annotations.forEach(a => {
    svgParts.push(`
      <rect x="${canvasW/2 - 300}" y="${annY - 20}" width="600" height="40" rx="12" fill="${theme.noteFill}" stroke="rgba(96,74,49,0.06)" />
      <text x="${canvasW/2}" y="${annY + 5}" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Georgia, serif" font-size="15" fill="${theme.ink}">${esc(a.text)}</text>
    `);
  });
}

svgParts.push('</svg>');

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, svgParts.join('\n'));
console.log(`Wrote ${output}`);
