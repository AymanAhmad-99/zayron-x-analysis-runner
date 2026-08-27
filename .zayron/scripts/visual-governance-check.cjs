const fs = require('fs');
const path = require('path');

console.log('[ZAYRON-X] Running Automated Visual Governance Check...');

const appDir = path.join(process.cwd(), 'apps', 'web', 'app');
const componentsDir = path.join(process.cwd(), 'apps', 'web', 'components');

const forbiddenTokens = [
  { pattern: /backdrop-blur-(?:xl|2xl|3xl)/i, name: 'Excessive Glassmorphism Backdrop Blur' },
  { pattern: /zayron-x-terminal/i, name: 'Legacy CRT/Terminal Component' },
  { pattern: /cyber-(?:grid|matrix|glow)/i, name: 'Cyberpunk Aesthetic Marker' },
  { pattern: /neon-(?:glow|border|text)/i, name: 'Neon Glow Marker' },
  { pattern: /text-green-400.*font-mono.*root@/i, name: 'Fake Command Prompt Terminal' },
  { pattern: /bg-gradient-to-r\s+from-purple/i, name: 'Gaudy Rainbow Gradient' }
];

let violations = 0;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const rule of forbiddenTokens) {
        if (rule.pattern.test(content)) {
          console.error(`\x1b[31m[VISUAL VIOLATION] ${rule.name} detected in ${path.relative(process.cwd(), fullPath)}\x1b[0m`);
          violations++;
        }
      }
    }
  }
}

scanDirectory(appDir);
scanDirectory(componentsDir);

if (violations > 0) {
  console.error(`\x1b[31m[BLOCKED] ${violations} visual governance violations detected.\x1b[0m`);
  process.exit(1);
} else {
  console.log('[ZAYRON-X] Visual Governance Check: PASS (0 violations)');
  process.exit(0);
}
