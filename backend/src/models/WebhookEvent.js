import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, default: 'razorpay' },
  eventId: { type: String, required: true },
  eventType: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  processedAt: { type: Date, default: null },
  processingError: { type: String, select: false }
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ processedAt: 1, createdAt: 1 });
export default mongoose.model('WebhookEvent', webhookEventSchema);
