import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const addressSchema = new mongoose.Schema({
  fullName: { type: String, trim: true, maxlength: 100 },
  phone: { type: String, trim: true },
  pincode: { type: String, trim: true },
  addressLine1: { type: String, trim: true },
  addressLine2: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  type: { type: String, enum: ['home', 'work'], default: 'home' },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true, select: false },
  avatar: { type: String, default: '' },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
  phone: { type: String, trim: true, default: '' },
  addresses: { type: [addressSchema], default: [] },
  refreshTokenHashes: [{ type: String, select: false }],
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, select: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
