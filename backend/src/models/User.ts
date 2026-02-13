import { Schema, model, Document } from 'mongoose';

export type UserRole = 'patient' | 'caretaker' | 'doctor' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    role: {
      type: String,
      enum: ['patient', 'caretaker', 'doctor', 'admin'],
      required: true,
    },

    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ role: 1 });

export const User = model<IUser>('User', userSchema);
