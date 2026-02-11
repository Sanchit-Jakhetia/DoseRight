import { Schema, model, Document, Types } from 'mongoose';

interface IIllness {
  name: string;
  diagnosedAt?: Date;
  status: 'ongoing' | 'under_control' | 'resolved';
  notes?: string;
}

interface ICaretakerLink {
  userId: Types.ObjectId;
  relationship?: string;
  approved: boolean;
  requestedAt: Date;
  approvedAt?: Date | null;
}

export interface IPatient extends Document {
  userId: Types.ObjectId;
  deviceId?: Types.ObjectId;
  medicalProfile?: {
    illnesses?: IIllness[];
    allergies?: string[];
    otherNotes?: string;
  };
  caretakers: ICaretakerLink[];
  doctors: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const illnessSchema = new Schema<IIllness>(
  {
    name: { type: String, required: true },
    diagnosedAt: { type: Date },
    status: {
      type: String,
      enum: ['ongoing', 'under_control', 'resolved'],
      default: 'ongoing',
    },
    notes: { type: String },
  },
  { _id: false }
);

const caretakerLinkSchema = new Schema<ICaretakerLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relationship: { type: String },
    approved: { type: Boolean, default: false },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
  },
  { _id: false }
);

const patientSchema = new Schema<IPatient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: false,
      sparse: true,
    },

    medicalProfile: {
      illnesses: [illnessSchema],
      allergies: [{ type: String }],
      otherNotes: { type: String },
    },

    caretakers: [caretakerLinkSchema],

    doctors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Indexes
patientSchema.index({ 'caretakers.userId': 1 });
patientSchema.index({ doctors: 1 });

export const Patient = model<IPatient>('Patient', patientSchema);
