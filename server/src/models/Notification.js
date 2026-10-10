import mongoose from 'mongoose';

// Delivery log for outbound notifications. Kept separate from Order so a failed
// notification never affects order state.
const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['order_created', 'order_status', 'customer_invoice', 'customer_order_approval', 'low_stock_alert'], required: true },
    channel: { type: String, enum: ['whatsapp', 'email'], required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    recipient: { type: String, default: '' },
    message: { type: String, required: true },
    // File sent with the message (the Tax Invoice PDF); regenerated from the order on resend.
    attachment: { type: String, default: '' },
    provider: { type: String, enum: ['whatsapp_cloud', 'dev_log', 'smtp'], required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'logged'], default: 'pending', index: true },
    providerMessageId: String,
    error: String,
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
