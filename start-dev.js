const { spawn } = require('child_process');

console.log('Starting development server...');

const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
});

child.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

