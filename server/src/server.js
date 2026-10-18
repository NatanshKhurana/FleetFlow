import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`FleetFlow API is running at http://localhost:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('Unable to start FleetFlow API:', error.message);
  process.exit(1);
});
