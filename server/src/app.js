import express from 'express';

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

// Express recognizes error middleware by these four parameters; keep it last.
app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
    });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      success: false,
      message: 'Request body is too large',
    });
  }

  // Keep internal error details out of the public response.
  console.error('Unexpected API error:', error);
  response.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

export default app;
