import { GitHubData } from './github';

export interface ComponentData {
  weekIdx:        number;
  height:         number;      // height of the component
  componentType:  'resistor' | 'transistor' | 'chip' | 'processor' | 'empty';
  color:          string;
  pins:           number;      // number of terminal pins on the component
  hasLed:         boolean;     // active status indicator LED
}

export interface TraceData {
  id:         number;
  points:     string;      // SVG points format: "x1,y1 x2,y2..."
  pulseColor: string;
  speed:      number;      // animation duration (faster if more stars)
  delay:      number;
}

export interface ChipConnectorData {
  x:          number;
  y:          number;
  width:      number;
}

export interface CircuitData {
  components:        ComponentData[];
  traces:            TraceData[];
  connectors:        ChipConnectorData[];
  pcbColor:          string;
  traceBaseColor:    string;
  traceActiveColor:  string;
  ledColor:          string;
  isGlitching:       boolean; // if open issues are high
  powerLevel:        number;  // 0 - 100 based on streak
  totalStars:        number;
  totalContributions: number;
  streak:            number;
  username:          string;
}

const PCB_THEMES: Record<string, { pcb: string, baseTrace: string, activeTrace: string, led: string }> = {
  JavaScript: {
    pcb: '#111111', baseTrace: '#332a15', activeTrace: '#f1c40f', led: '#ff9f43'
  },
  TypeScript: {
    pcb: '#0f1c2e', baseTrace: '#1b324f', activeTrace: '#00d2ff', led: '#10ac84'
  },
  Python: {
    pcb: '#0b2316', baseTrace: '#174026', activeTrace: '#2ecc71', led: '#a3cb38'
  },
  Go: {
    pcb: '#1c242c', baseTrace: '#2c3e50', activeTrace: '#00afdb', led: '#00d2ff'
  },
  Rust: {
    pcb: '#2c1205', baseTrace: '#4c260f', activeTrace: '#e74c3c', led: '#ee5253'
  }
};

const DEFAULT_THEME = {
  pcb: '#1e272e', baseTrace: '#2f3542', activeTrace: '#9b59b6', led: '#ff4757'
};

export function buildCircuit(data: GitHubData): CircuitData {
  const theme = PCB_THEMES[data.topLanguage] || DEFAULT_THEME;
  const allMax = Math.max(...data.weeks.flatMap(w => w.map(d => d.count)), 1);

  // 1. Build components from weeks (52 weeks)
  const components: ComponentData[] = data.weeks.map((week, i) => {
    const maxCount = Math.max(...week.map(d => d.count), 0);
    let height = 0;
    let componentType: ComponentData['componentType'] = 'empty';
    let pins = 0;

    if (maxCount > 0) {
      const norm = Math.log(maxCount + 1) / Math.log(allMax + 1);
      height = Math.round(10 + norm * 80);
      componentType = maxCount > 8 ? 'processor' : maxCount > 4 ? 'chip' : maxCount > 2 ? 'transistor' : 'resistor';
      pins = componentType === 'processor' ? 12 : componentType === 'chip' ? 8 : componentType === 'transistor' ? 3 : 2;
    }

    const colorPalette = [theme.activeTrace, '#9b59b6', '#3498db', '#e67e22', '#1abc9c'];
    const color = colorPalette[(maxCount + i) % colorPalette.length];

    return {
      weekIdx: i,
      height,
      componentType,
      color,
      pins,
      hasLed: componentType === 'processor' || (componentType === 'chip' && i % 3 === 0),
    };
  });

  // 2. Build animated trace lines (electricity conduits)
  const traces: TraceData[] = [];
  const W = 900;
  const H = 260;
  const traceCount = 15;
  const speed = Math.max(1, 10 - Math.min(8, Math.log10(data.totalStars + 1) * 2.5)); // speed scales with star count (faster)

  for (let i = 0; i < traceCount; i++) {
    // Generate deterministic paths on the board
    const seed = data.username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const startX = Math.round(((seed * (i + 1) * 47) % (W - 100)) + 50);
    const yLevel = 40 + ((seed * (i + 1) * 19) % 150);
    
    // Create orthagonal trace path: start -> horizontal/diagonal -> end
    const segment1X = startX + 50;
    const segment2X = segment1X + 40;
    const segment2Y = yLevel + 30;
    const segment3X = segment2X + 80;

    const points = `${startX},${yLevel} ${segment1X},${yLevel} ${segment2X},${segment2Y} ${segment3X},${segment2Y}`;

    traces.push({
      id: i,
      points,
      pulseColor: theme.activeTrace,
      speed,
      delay: (i * 0.5) % 4,
    });
  }

  // 3. Connectors (ribbon cables/bridges) from closed issues/PRs
  const connectors: ChipConnectorData[] = [];
  const closedCount = data.closedIssues || 0;
  if (closedCount > 0) {
    const connectorCount = Math.min(4, Math.ceil(closedCount / 15));
    for (let i = 0; i < connectorCount; i++) {
      const seed = data.username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      connectors.push({
        x: 120 + ((seed * (i + 1) * 37) % 650),
        y: 80 + ((seed * (i + 1) * 13) % 80),
        width: 30 + ((seed * (i + 1) * 9) % 40),
      });
    }
  }

  const isGlitching = data.openIssues > 25;
  const powerLevel = Math.min(100, Math.round((data.streak / 30) * 100));

  return {
    components,
    traces,
    connectors,
    pcbColor: theme.pcb,
    traceBaseColor: theme.baseTrace,
    traceActiveColor: theme.activeTrace,
    ledColor: theme.led,
    isGlitching,
    powerLevel,
    totalStars: data.totalStars,
    totalContributions: data.totalContributions,
    streak: data.streak,
    username: data.username,
  };
}
