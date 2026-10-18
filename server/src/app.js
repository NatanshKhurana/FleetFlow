import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Parse JSON before routes so malformed request bodies reach the error handler.
app.use(express.json());

app.get('/api/health', (request, response) => {
  response.status(200).json({
    success: true,
    message: 'FleetFlow API is running',
  });
});

// This runs only when no route above has answered the request.
app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

export default app;
