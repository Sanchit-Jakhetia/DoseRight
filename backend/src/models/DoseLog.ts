import { Schema, model, Document, Types } from 'mongoose';

export type DoseStatus =
  | 'pending'
  | 'dispensed'
  | 'taken'
  | 'missed'
  | 'skipped'
  | 'error';

export interface IDoseLog extends Document {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  medicationPlanId: Types.ObjectId;

  slotIndex: number;

  scheduledAt: Date;

  status: DoseStatus;
  dispensedAt?: Date;
  takenAt?: Date;
  missedReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const doseLogSchema = new Schema<IDoseLog>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    medicationPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicationPlan',
      required: true,
    },

    slotIndex: { type: Number, required: true },

    scheduledAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ['pending', 'dispensed', 'taken', 'missed', 'skipped', 'error'],
      default: 'pending',
    },

    dispensedAt: { type: Date },
    takenAt: { type: Date },
    missedReason: { type: String, default: null },
  },
  { timestamps: true }
);

// Indexes
doseLogSchema.index({ patientId: 1, scheduledAt: -1 });
doseLogSchema.index({ status: 1, scheduledAt: -1 });

export const DoseLog = model<IDoseLog>('DoseLog', doseLogSchema);
