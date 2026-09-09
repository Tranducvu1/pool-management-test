const express = require('express');
const cors = require('cors');

const config = require('./config');
const requestLogger = require('./middlewares/requestLogger');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes/api');
const { UPLOAD_ROOT } = require('./utils/savePhoto');

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(requestLogger);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Pool Management Backend API',
    status: 'Running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// API Routes
app.use('/uploads', express.static(UPLOAD_ROOT));
app.use('/api', apiRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
