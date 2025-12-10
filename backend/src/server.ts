import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { connectDB } from './models';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import hardwareRouter from './routes/hardware.routes';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hardware', hardwareRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const host = '0.0.0.0';
    app.listen(config.port, host, () => {
      console.log(`\n🚀 Server running on http://${host}:${config.port} in ${config.nodeEnv} mode`);
      console.log(`✓ CORS enabled for: ${config.corsOrigin}`);
      console.log(`✓ API Base URL: http://${host === '0.0.0.0' ? 'localhost' : host}:${config.port}/api\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
