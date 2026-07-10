import { CircuitData, ComponentData, TraceData, ChipConnectorData } from './circuit';

const W       = 900;
const H       = 260;
const BUS_Y   = 190;   // component mounting bus line
const TILE_W  = W / 52; // ≈ 17.3px per column

export function renderSVG(cir: CircuitData, username: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     style="border-radius:12px;overflow:hidden;background:${cir.pcbColor}">
  <defs>
    <!-- Glow filter for neon electric pulses and LEDs -->
    <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="pcb-shading" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.03)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.4)"/>
    </linearGradient>
  </defs>

  <!-- PCB shading overlay -->
  <rect width="${W}" height="${H}" fill="url(#pcb-shading)"/>

  <!-- PCB Grid texture -->
  ${renderGridPattern()}

  <!-- Board circular vias/mounts in corners -->
  <circle cx="20" cy="20" r="8" fill="none" stroke="${cir.traceBaseColor}" stroke-width="2"/>
  <circle cx="20" cy="20" r="4" fill="${cir.pcbColor}" stroke="${cir.traceBaseColor}" stroke-width="1"/>
  <circle cx="${W - 20}" cy="20" r="8" fill="none" stroke="${cir.traceBaseColor}" stroke-width="2"/>
  <circle cx="${W - 20}" cy="20" r="4" fill="${cir.pcbColor}" stroke="${cir.traceBaseColor}" stroke-width="1"/>

  <!-- Main bus line track -->
  <line x1="10" y1="${BUS_Y}" x2="${W - 10}" y2="${BUS_Y}" stroke="${cir.traceBaseColor}" stroke-width="3" stroke-linecap="round"/>

  <!-- Base Trace Lines (un-pulsed background paths) -->
  ${cir.traces.map(t => `<polyline points="${t.points}" fill="none" stroke="${cir.traceBaseColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n  ')}

  <!-- Active Neon Pulsing Traces -->
  ${cir.traces.map(t => renderActiveTrace(t, cir)).join('\n  ')}

  <!-- Component Bridges / Ribbon Cables -->
  ${cir.connectors.map(c => renderConnector(c, cir)).join('\n  ')}

  <!-- Mounted Components (Resistors, Chips, etc.) -->
  ${cir.components.map(c => renderComponent(c, cir)).join('\n  ')}

  <!-- Side Power Level LED Bar (Contribution Streak) -->
  ${renderPowerBar(cir)}

  <!-- Glitching sparks if open issues are high -->
  ${cir.isGlitching ? renderSparks(cir) : ''}

  <!-- HUD Panel -->
  ${renderHUD(cir, username)}

  <style>${renderCSS(cir)}</style>
</svg>`;
}

// ─── PCB Grid Pattern overlay ──────────────────────────────
function renderGridPattern(): string {
  const lines: string[] = [];
  // vertical grid
  for (let x = 40; x < W; x += 40) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>`);
  }
  // horizontal grid
  for (let y = 30; y < H; y += 30) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>`);
  }
  return lines.join('\n  ');
}

// ─── Active Pulsing Trace Line ──────────────────────────────
function renderActiveTrace(t: TraceData, cir: CircuitData): string {
  // Uses stroke-dasharray and stroke-dashoffset to animate the current pulse
  return `
    <polyline class="pulse-trace" points="${t.points}" fill="none" 
      stroke="${cir.traceActiveColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      filter="url(#neon-glow)"
      style="animation-duration:${t.speed}s; animation-delay:${t.delay}s"/>
  `;
}

// ─── Ribbon Cable Connector ─────────────────────────────────
function renderConnector(c: ChipConnectorData, cir: CircuitData): string {
  return `
    <g transform="translate(${c.x}, ${c.y})">
      <!-- Ribbon base -->
      <rect x="0" y="0" width="${c.width}" height="10" fill="#2c3e50" rx="1"/>
      <!-- Striped wires inside ribbon -->
      <line x1="4" y1="0" x2="4" y2="10" stroke="#e74c3c" stroke-width="1.5"/>
      <line x1="10" y1="0" x2="10" y2="10" stroke="#ecf0f1" stroke-width="1.5"/>
      <line x1="16" y1="0" x2="16" y2="10" stroke="#3498db" stroke-width="1.5"/>
      <line x1="22" y1="0" x2="22" y2="10" stroke="#f1c40f" stroke-width="1.5"/>
      ${c.width > 30 ? `<line x1="28" y1="0" x2="28" y2="10" stroke="#2ecc71" stroke-width="1.5"/>` : ''}
      <!-- Connector endpoints -->
      <rect x="-2" y="-2" width="6" height="14" fill="#111" rx="0.5"/>
      <rect x="${c.width - 4}" y="-2" width="6" height="14" fill="#111" rx="0.5"/>
    </g>
  `;
}

// ─── PCB Component Renderer ─────────────────────────────────
function renderComponent(comp: ComponentData, cir: CircuitData): string {
  if (comp.componentType === 'empty') return '';

  const x  = comp.weekIdx * TILE_W + TILE_W / 2;
  const h  = comp.height;
  const col = comp.color;
  const cw = TILE_W - 3;

  let out = '';

  // 1. Draw component connection legs/pins to bus line
  for (let p = 0; p < comp.pins; p++) {
    const px = x - cw/2 + (cw / (comp.pins - 1 || 1)) * p;
    out += `<line x1="${px}" y1="${BUS_Y}" x2="${px}" y2="${BUS_Y + 8}" stroke="#bdc3c7" stroke-width="1"/>`;
  }

  // 2. Draw component body
  const compY = BUS_Y + 8;
  switch (comp.componentType) {
    case 'resistor':
      // Cylinder with bands
      out += `
        <rect x="${x - 3}" y="${compY}" width="6" height="${h}" fill="#dfb887" rx="2" stroke="#7f603c" stroke-width="0.8"/>
        <!-- Resistor Color Bands -->
        <rect x="${x - 3}" y="${compY + h*0.2}" width="6" height="2" fill="#c0392b"/>
        <rect x="${x - 3}" y="${compY + h*0.5}" width="6" height="2" fill="#f1c40f"/>
        <rect x="${x - 3}" y="${compY + h*0.7}" width="6" height="2" fill="#27ae60"/>
      `;
      break;

    case 'transistor':
      // Semi-circle package (TO-92)
      out += `
        <path d="M ${x - 5},${compY} L ${x + 5},${compY} L ${x + 5},${compY + h} C ${x + 5},${compY + h + 4} ${x - 5},${compY + h + 4} ${x - 5},${compY + h} Z" fill="#111" stroke="#333" stroke-width="0.5"/>
        <rect x="${x - 4}" y="${compY + 2}" width="8" height="2" fill="${col}"/>
      `;
      break;

    case 'chip':
      // Dual Inline Package (DIP) IC
      out += `
        <rect x="${x - 5}" y="${compY}" width="10" height="${h}" fill="#222" rx="1" stroke="#444" stroke-width="0.5"/>
        <line x1="${x}" y1="${compY}" x2="${x}" y2="${compY + 3}" stroke="#111" stroke-width="1.5"/> <!-- pin 1 notch -->
        <rect x="${x - 4}" y="${compY + h*0.3}" width="8" height="${h*0.4}" fill="${col}" opacity="0.8"/>
      `;
      break;

    case 'processor':
      // Large Square processor (QFP)
      out += `
        <rect x="${x - 7}" y="${compY}" width="14" height="${h}" fill="#1b1c1e" rx="1.5" stroke="#34495e" stroke-width="0.8"/>
        <rect x="${x - 5}" y="${compY + 2}" width="10" height="${h - 4}" fill="#0d0e0f" rx="1"/>
        <!-- Core silicon dye -->
        <rect x="${x - 2}" y="${compY + h*0.4}" width="4" height="6" fill="${col}" filter="url(#neon-glow)"/>
      `;
      break;
  }

  // 3. Status indicator LED
  if (comp.hasLed) {
    const ledY = compY + h * 0.15;
    const delay = (comp.weekIdx * 0.3 % 2.5).toFixed(1);
    out += `
      <circle class="led" cx="${x}" cy="${ledY}" r="2" fill="${cir.ledColor}" filter="url(#neon-glow)"
        style="animation-delay:${delay}s"/>
    `;
  }

  return `<g class="component">${out}</g>`;
}

// ─── Power indicator LED bar (Streak status) ────────────────
function renderPowerBar(cir: CircuitData): string {
  const bars: string[] = [];
  const startX = W - 32;
  const startY = 160;
  
  // 5 bar segmented LED
  for (let i = 0; i < 5; i++) {
    const y = startY - i * 14;
    const threshold = (i + 1) * 20;
    const active = cir.powerLevel >= threshold;
    const color = active ? (i === 4 ? '#ff4757' : i >= 2 ? '#ffa502' : '#2ed573') : '#2c3e50';

    bars.push(`
      <rect x="${startX}" y="${y}" width="18" height="8" fill="${color}" rx="1"
        ${active ? 'filter="url(#neon-glow)" class="power-led"' : ''} 
        style="animation-delay:${(i * 0.15).toFixed(2)}s"/>
    `);
  }

  return `
    <g>
      <!-- Housing -->
      <rect x="${W - 36}" y="${startY - 60}" width="26" height="80" fill="rgba(0,0,0,0.6)" rx="3" stroke="${cir.traceBaseColor}" stroke-width="1.5"/>
      ${bars.join('\n    ')}
      <text x="${W - 35}" y="${startY + 32}" font-family="monospace" font-size="8" fill="#fff" opacity="0.7">PWR</text>
    </g>
  `;
}

// ─── Spark Generator (Glitch effect for unresolved bugs) ─────
function renderSparks(cir: CircuitData): string {
  const sparks: string[] = [];
  const seed = cir.username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // Spawns 4 glitch sparks randomly over traces
  for (let i = 0; i < 4; i++) {
    const sx = 100 + ((seed * (i + 1) * 73) % 700);
    const sy = 50 + ((seed * (i + 1) * 41) % 120);
    const delay = (i * 0.7).toFixed(1);

    sparks.push(`
      <g transform="translate(${sx}, ${sy})" class="spark-group" style="animation-delay:${delay}s">
        <line x1="0" y1="0" x2="-8" y2="-8" stroke="#ff4757" stroke-width="1.2" />
        <line x1="0" y1="0" x2="8" y2="-6" stroke="#ffa502" stroke-width="1.2" />
        <line x1="0" y1="0" x2="-4" y2="8" stroke="#fff" stroke-width="1.5" />
        <circle cx="0" cy="0" r="3" fill="#ff4757" filter="url(#neon-glow)"/>
      </g>
    `);
  }
  return sparks.join('\n');
}

// ─── HUD Overlay ────────────────────────────────────────────
function renderHUD(cir: CircuitData, username: string): string {
  return `
  <g>
    <rect x="8" y="8" width="220" height="22" rx="4" fill="rgba(0,0,0,0.6)" stroke="${cir.traceBaseColor}" stroke-width="1"/>
    <text x="14" y="22" font-family="monospace" font-size="10" fill="#fff" font-weight="bold">
      ⚡ ${username}'s Core · ${cir.totalContributions} units
    </text>
  </g>
  <g>
    <rect x="${W - 250}" y="8" width="200" height="22" rx="4" fill="rgba(0,0,0,0.6)" stroke="${cir.traceBaseColor}" stroke-width="1"/>
    <text x="${W - 244}" y="22" font-family="monospace" font-size="10" fill="${cir.traceActiveColor}" font-weight="bold">
      CLK: ${Math.round(100 + (cir.totalStars * 0.8))} MHz · STREAK: ${cir.streak}d
    </text>
  </g>`;
}

// ─── CSS Animations ──────────────────────────────────────────
function renderCSS(cir: CircuitData): string {
  return `
    /* Pulsing current trace flow */
    .pulse-trace {
      stroke-dasharray: 40, 160;
      stroke-dashoffset: 200;
      animation: trace-flow infinite linear;
    }
    @keyframes trace-flow {
      to { stroke-dashoffset: 0; }
    }

    /* Flashing status indicator LEDs */
    .led {
      animation: led-blink 1.8s ease-in-out infinite alternate;
    }
    @keyframes led-blink {
      0%, 30%   { opacity: 0.15; filter: brightness(0.5); }
      70%, 100% { opacity: 1; filter: brightness(1.6); }
    }

    /* Power bar LED segment breath animation */
    .power-led {
      animation: power-breath 2.5s ease-in-out infinite alternate;
    }
    @keyframes power-breath {
      0%   { filter: brightness(0.8) drop-shadow(0 0 1px ${cir.traceActiveColor}); }
      100% { filter: brightness(1.3) drop-shadow(0 0 4px ${cir.traceActiveColor}); }
    }

    /* Glitch spark explosion */
    .spark-group {
      opacity: 0;
      animation: glitch-spark 2.5s ease-in-out infinite;
      transform-origin: center;
    }
    @keyframes glitch-spark {
      0%, 90% { opacity: 0; transform: scale(0.3); }
      92%     { opacity: 1; transform: scale(1.2); }
      94%     { opacity: 0.5; transform: scale(0.9); }
      95%     { opacity: 1; transform: scale(1.4); }
      98%, 100% { opacity: 0; transform: scale(0.5); }
    }
  `;
}
