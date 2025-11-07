// Replit dev:replit - Build web, then start API (single port on 5000)
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔄 Starting Replit dev mode (single port)...\n');

// Step 1: Build web app
console.log('📦 Building web app...');
const buildWeb = spawn('pnpm', ['-F', '@repo/web', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: process.env, // Pass all environment variables to the build process
});

buildWeb.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to build web app');
    process.exit(code || 1);
  }
  
  console.log('✅ Web app built\n');
  
  // Step 2: Start API server (serves web + API on port 5000)
  console.log('🚀 Starting API server...\n');
  const api = spawn('pnpm', ['-F', '@repo/api', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: process.env, // Pass all environment variables to the API server
  });

  process.on('SIGINT', () => {
    api.kill();
    process.exit();
  });

  api.on('exit', (code) => {
    console.log(`API exited with code ${code}`);
    process.exit(code || 0);
  });
});
