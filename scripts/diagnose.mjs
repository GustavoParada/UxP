import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const envPath = path.join(ROOT, '.env');

console.log('=== ArkLogBot diagnose ===\n');
console.log(`Pasta: ${ROOT}`);
console.log(`Node: ${process.version}`);

for (const file of ['.env', 'dist/index.js', 'scripts/start-linux.sh']) {
  console.log(`${file}: ${fs.existsSync(path.join(ROOT, file)) ? 'OK' : 'AUSENTE'}`);
}

for (const cmd of ['xvfb-run', 'bash', 'pm2']) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    console.log(`${cmd}: OK`);
  } catch {
    console.log(`${cmd}: NÃO ENCONTRADO`);
  }
}

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const hasToken = lines.some(l => l.startsWith('DISCORD_TOKEN=') && l.length > 'DISCORD_TOKEN='.length + 1);
  const hasAppId = lines.some(l => l.startsWith('APPLICATION_ID=') && l.length > 'APPLICATION_ID='.length + 1);
  console.log(`DISCORD_TOKEN preenchido: ${hasToken ? 'sim' : 'NÃO'}`);
  console.log(`APPLICATION_ID preenchido: ${hasAppId ? 'sim' : 'NÃO'}`);
} else {
  console.log('DISCORD_TOKEN preenchido: N/A (.env ausente)');
  console.log('APPLICATION_ID preenchido: N/A (.env ausente)');
}

try {
  const pm2 = execSync('pm2 jlist', { encoding: 'utf8' });
  const apps = JSON.parse(pm2);
  const bot = apps.find(a => a.name === 'arklogjs');
  if (bot) {
    console.log(`\nPM2 arklogjs: status=${bot.pm2_env?.status ?? '?'} restarts=${bot.pm2_env?.restart_time ?? 0}`);
  } else {
    console.log('\nPM2 arklogjs: não registrado');
  }
} catch {
  console.log('\nPM2: não disponível ou sem processos');
}

console.log('\nPróximo passo: npm run pm2-logs');
