import { spawn } from 'node:child_process';

const windows = process.platform === 'win32';
const children = [];
let stopping = false;

function start(label, args, env = {}) {
  // `spawn('npm.cmd')` raises EINVAL on Windows when `shell: false`. Invoke
  // the system command interpreter explicitly there; all arguments below are
  // static project commands, never user-provided values.
  const command = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const commandArgs = windows ? ['/d', '/s', '/c', ['npm', ...args].join(' ')] : args;
  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    stopping = true;
    console.error(`${label} stopped (${signal ?? code ?? 'unknown'}); stopping local stack.`);
    for (const sibling of children) {
      if (sibling !== child && !sibling.killed) sibling.kill('SIGTERM');
    }
    process.exitCode = code && code !== 0 ? code : 1;
  });
  return child;
}

function stop(signal) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

start('API', ['--prefix', 'server', 'run', 'dev']);
start('Vite', ['run', 'dev', '--', '--host', '127.0.0.1'], {
  VITE_DATA_SOURCE: 'local',
  VITE_API_PROXY_TARGET: 'http://127.0.0.1:4000',
});
