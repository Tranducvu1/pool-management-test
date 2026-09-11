const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const requestLogger = require('./middlewares/requestLogger');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes/api');
const { UPLOAD_ROOT } = require('./utils/savePhoto');

const app = express();
const frontendDist = path.join(__dirname, '../../front-end/dist');

// Global Middlewares
app.use(
  cors({
    origin: config.isDev ? config.clientUrl : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(requestLogger);

if (config.isDev) {
  app.get('/', (_req, res) => {
    res.json({
      name: 'Pool Management Backend API',
      status: 'Running',
      version: '1.0.0',
      documentation: '/api/health',
    });
  });
}

// API Routes
app.use('/uploads', express.static(UPLOAD_ROOT));
app.use('/api', apiRoutes);
app.use('/api', notFoundHandler);

if (!config.isDev) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (config.isDev) {
  app.use(notFoundHandler);
}

// Global Error Handler
app.use(errorHandler);

module.exports = app;
