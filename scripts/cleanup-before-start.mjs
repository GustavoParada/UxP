import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { platform } from 'os';

const ROOT = process.cwd();
const LOCK_FILE = path.join(ROOT, '.arklogbot.lock');
const ENTRY_SCRIPT = path.join(ROOT, 'dist', 'index.js');

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error).code === 'EPERM';
  }
}

function readLockPid() {
  try {
    const raw = fs.readFileSync(LOCK_FILE, 'utf8').trim();
    const pid = Number.parseInt(raw.split(/\s+/)[0] ?? '', 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy-wait
  }
}

function killPid(pid, label) {
  if (!isProcessAlive(pid)) return;
  console.log(`Encerrando ${label} (PID ${pid})...`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }

  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return;
    sleepSync(250);
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }
}

function runPm2Delete() {
  try {
    execSync('pm2 delete arklogjs', { stdio: 'ignore', windowsHide: true });
    console.log('Processo PM2 arklogjs removido.');
  } catch {
    // not running under pm2
  }
}

function findOrphanBotPids() {
  const entryMarker = ENTRY_SCRIPT.replace(/\\/g, '/');
  const pids = new Set();

  if (platform() === 'win32') {
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ` +
          `Where-Object { $_.CommandLine -like '*${entryMarker.replace(/'/g, "''")}*' } | ` +
          `Select-Object -ExpandProperty ProcessId`,
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    for (const line of (result.stdout ?? '').split(/\r?\n/)) {
      const pid = Number.parseInt(line.trim(), 10);
      if (pid > 0) pids.add(pid);
    }
    return [...pids];
  }

  try {
    const output = execSync('pgrep -af node', { encoding: 'utf8', windowsHide: true });
    for (const line of output.split('\n')) {
      if (!line.includes(entryMarker)) continue;
      const pid = Number.parseInt(line.trim().split(/\s+/)[0] ?? '', 10);
      if (pid > 0) pids.add(pid);
    }
  } catch {
    // pgrep returns 1 when nothing matches
  }

  return [...pids];
}

function removeLockFile() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // ignore
  }
}

console.log('Garantindo ambiente limpo antes de iniciar o bot...');
runPm2Delete();

const lockPid = readLockPid();
if (lockPid !== null && lockPid !== process.pid) {
  killPid(lockPid, 'instância do lock');
}

for (const pid of findOrphanBotPids()) {
  if (pid === process.pid) continue;
  killPid(pid, 'processo órfão do bot');
}

removeLockFile();
console.log('Ambiente pronto para uma única instância.');
