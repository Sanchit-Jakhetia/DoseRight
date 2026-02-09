import dotenv from 'dotenv';

dotenv.config();

const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigins = corsOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/doseright',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  deviceSecret: process.env.DEVICE_SECRET || 'change-device-secret',
  corsOrigin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
};
