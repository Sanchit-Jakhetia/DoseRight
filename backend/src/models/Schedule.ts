import { Schema, model, Document, Types } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  patientId: Types.ObjectId;
  name?: string;
  timezone: string;
  slotCount: number;
  lastHeartbeatAt?: Date;
  lastStatus?: 'online' | 'offline' | 'error';
  batteryLevel?: number;
  wifiStrength?: number;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    deviceId: { type: String, required: true, unique: true },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    name: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },

    slotCount: { type: Number, default: 5 },

    lastHeartbeatAt: { type: Date },
    lastStatus: {
      type: String,
      enum: ['online', 'offline', 'error'],
      default: 'offline',
    },

    batteryLevel: { type: Number, min: 0, max: 100 },
    wifiStrength: { type: Number },
  },
  { timestamps: true }
);

// Indexes
deviceSchema.index({ patientId: 1 });

export const Device = model<IDevice>('Device', deviceSchema);
