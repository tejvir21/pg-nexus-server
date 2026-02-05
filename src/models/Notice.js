const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: true,
      enum: ['general', 'maintenance', 'event', 'payment', 'policy', 'safety', 'other'],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'specific_property', 'specific_floor'],
      default: 'all',
    },
    targetFloor: {
      type: String,
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validTill: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
      index: true,
    },
    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
        type: String,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
noticeSchema.index({ property: 1, status: 1 });
noticeSchema.index({ status: 1, validFrom: 1 });
noticeSchema.index({ createdBy: 1 });

// Virtual for is currently valid
noticeSchema.virtual('isValid').get(function () {
  const now = new Date();
  const validFrom = this.validFrom <= now;
  const validTill = !this.validTill || this.validTill >= now;
  return this.status === 'active' && validFrom && validTill;
});

// Method to mark as read by a user
noticeSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.some(
    (read) => read.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
  }

  return this.save();
};

// Static method to get active notices
noticeSchema.statics.getActiveNotices = async function (filter = {}) {
  const now = new Date();
  return await this.find({
    ...filter,
    status: 'active',
    validFrom: { $lte: now },
    $or: [{ validTill: { $gte: now } }, { validTill: null }],
  }).sort({ priority: -1, createdAt: -1 });
};

module.exports = mongoose.model('Notice', noticeSchema);
