const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: true,
      enum: [
        'plumbing',
        'electrical',
        'cleaning',
        'maintenance',
        'wifi',
        'security',
        'noise',
        'pest_control',
        'other',
      ],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    response: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters'],
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timeline: [
      {
        status: {
          type: String,
          enum: ['open', 'in-progress', 'resolved', 'closed'],
        },
        comment: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
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
complaintSchema.index({ tenant: 1, status: 1 });
complaintSchema.index({ property: 1, status: 1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });

// Add to timeline when status changes
complaintSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
    });

    if (this.status === 'resolved') {
      this.resolvedAt = new Date();
    }
  }
  next();
});

// Virtual for resolution time
complaintSchema.virtual('resolutionTime').get(function () {
  if (this.resolvedAt) {
    const diff = this.resolvedAt - this.createdAt;
    return Math.floor(diff / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Static method to get complaint statistics
complaintSchema.statics.getComplaintStats = async function (propertyId) {
  return await this.aggregate([
    { $match: { property: mongoose.Types.ObjectId(propertyId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get complaints by category
complaintSchema.statics.getComplaintsByCategory = async function (propertyId) {
  return await this.aggregate([
    { $match: { property: mongoose.Types.ObjectId(propertyId) } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        open: {
          $sum: {
            $cond: [{ $eq: ['$status', 'open'] }, 1, 0],
          },
        },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model('Complaint', complaintSchema);
