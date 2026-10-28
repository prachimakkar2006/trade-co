import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, trim: true, maxlength: 160, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new', index: true }
}, { timestamps: true });

contactMessageSchema.index({ createdAt: -1 });
export default mongoose.model('ContactMessage', contactMessageSchema);
