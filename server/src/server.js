import app from './app.js';

// Environment loading and validation belong to Step 3.
const port = 5000;

const server = app.listen(port, () => {
  console.log(`FleetFlow API is running at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Unable to start FleetFlow API:', error.message);
  process.exit(1);
});
