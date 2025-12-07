import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { connectDB } from './models';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';

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
    app.listen(config.port, () => {
      console.log(`\n🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      console.log(`✓ CORS enabled for: ${config.corsOrigin}`);
      console.log(`✓ API Base URL: http://localhost:${config.port}/api\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
