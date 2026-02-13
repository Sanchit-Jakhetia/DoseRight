import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/doseright';
  try {
    await mongoose.connect(mongodbUri);
    console.log(`✓ MongoDB connected: ${mongodbUri}`);
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  } catch (error) {
    console.error('✗ MongoDB disconnection error:', error);
  }
}

export async function dropDatabase(): Promise<void> {
  try {
    await mongoose.connection.db?.dropDatabase();
    console.log('✓ Database dropped');
  } catch (error) {
    console.error('✗ Error dropping database:', error);
    throw error;
  }
}

// Export all models
export { User, type IUser, type UserRole } from './User';
export { Patient, type IPatient } from './Patient';
export { Device, type IDevice } from './Device';
export { MedicationPlan, type IMedicationPlan } from './MedicationPlan';
export { DoseLog, type IDoseLog, type DoseStatus } from './DoseLog';
