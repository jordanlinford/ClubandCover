// Compatibility shim - redirects to new monorepo structure
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔄 Starting monorepo dev servers...\n');
console.log('📦 Building shared packages...');

// Build types package first
const buildTypes = spawn('pnpm', ['--filter', '@repo/types', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

buildTypes.on('exit', (code) => {
  if (code !== 0) {
    console.error('Failed to build types package');
    process.exit(code || 1);
  }
  
  console.log('✅ Shared packages built\n');
  
  // Start API server
  const api = spawn('pnpm', ['--filter', '@repo/api', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  // Start web server
  const web = spawn('pnpm', ['--filter', '@repo/web', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  process.on('SIGINT', () => {
    api.kill();
    web.kill();
    process.exit();
  });

  api.on('exit', (code) => {
    console.log(`API exited with code ${code}`);
    web.kill();
    process.exit(code || 0);
  });

  web.on('exit', (code) => {
    console.log(`Web exited with code ${code}`);
    api.kill();
    process.exit(code || 0);
  });
});
