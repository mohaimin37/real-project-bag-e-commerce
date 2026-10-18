import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['customer', 'admin', 'system'],
      required: true,
    },
    senderName: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    attachments: [
      {
        url: { type: String, trim: true },
        name: { type: String, trim: true },
      },
    ],
    orderContext: {
      orderId: { type: String, trim: true },
      grandTotal: { type: Number },
      orderStatus: { type: String },
      cancellationReason: { type: String },
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const chatThreadSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Customer',
    },
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: 'General Support',
      index: true,
    },
    orderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderContext: {
      orderId: { type: String, trim: true },
      grandTotal: { type: Number },
      orderStatus: { type: String },
      cancellationReason: { type: String },
    },
    status: {
      type: String,
      enum: ['open', 'waiting_admin', 'waiting_customer', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    unreadAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadCustomer: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: String, default: '' },
      senderName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    },
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

chatThreadSchema.index({ updatedAt: -1 });
chatThreadSchema.index({ status: 1, unreadAdmin: -1 });

export const ChatThread = mongoose.model('ChatThread', chatThreadSchema);
export default ChatThread;
