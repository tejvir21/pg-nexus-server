const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    month: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    lateFee: {
      type: Number,
      default: 0,
      min: [0, 'Late fee must be positive'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount must be positive'],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    paymentDate: {
      type: Date,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online', 'card'],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'partial'],
      default: 'pending',
      index: true,
    },
    receipt: {
      url: String,
      publicId: String,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
paymentSchema.index({ tenant: 1, month: 1 }, { unique: true });
paymentSchema.index({ property: 1, status: 1 });
paymentSchema.index({ status: 1, dueDate: 1 });

// Calculate total amount before saving
paymentSchema.pre('save', function (next) {
  this.totalAmount = this.amount + this.lateFee - this.discount;
  next();
});

// Auto-update status to overdue
paymentSchema.pre('save', function (next) {
  if (this.status === 'pending' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  next();
});

// Static method to get payment summary
paymentSchema.statics.getPaymentSummary = async function (filter = {}) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);
};

// Static method to get monthly revenue
paymentSchema.statics.getMonthlyRevenue = async function (propertyId, year) {
  return await this.aggregate([
    {
      $match: {
        property: mongoose.Types.ObjectId(propertyId),
        status: 'paid',
        paymentDate: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$paymentDate' },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);
