import { Schema, model, Document, Types } from 'mongoose';

export interface IMedicationPlan extends Document {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  slotIndex: number;

  medicationName: string;
  medicationStrength?: string;
  medicationForm?: 'tablet' | 'capsule' | 'syrup' | string;

  dosagePerIntake: number;

  times: string[];
  daysOfWeek: number[];

  active: boolean;
  startDate: Date;
  endDate?: Date | null;

  stock?: {
    totalLoaded: number;
    remaining: number;
    lastRefilledAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const medicationPlanSchema = new Schema<IMedicationPlan>(
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

    slotIndex: { type: Number, required: true },

    medicationName: { type: String, required: true },
    medicationStrength: { type: String },
    medicationForm: { type: String, default: 'tablet' },

    dosagePerIntake: { type: Number, required: true, min: 0.25 },

    times: [{ type: String, required: true }],
    daysOfWeek: [{ type: Number, min: 1, max: 7 }],

    active: { type: Boolean, default: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, default: null },

    stock: {
      totalLoaded: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      lastRefilledAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Indexes
medicationPlanSchema.index({ patientId: 1, active: 1 });

export const MedicationPlan = model<IMedicationPlan>(
  'MedicationPlan',
  medicationPlanSchema
);
