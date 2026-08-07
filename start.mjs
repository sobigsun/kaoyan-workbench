import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  appType: 'spa',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000 },
});
await server.listen();
console.log('');
console.log('  VITE DEV SERVER READY');
console.log('  Local:   http://localhost:3000/');
console.log('  Network: http://192.168.1.100:3000/');
console.log('');
