const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    alternatePhone: {
      type: String,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    emergencyContact: {
      name: { type: String, required: true },
      relation: { type: String, required: true },
      phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
      },
    },
    idProof: {
      type: {
        type: String,
        enum: ['aadhar', 'passport', 'driving_license', 'voter_id', 'other'],
        required: true,
      },
      number: {
        type: String,
        required: true,
      },
      document: {
        url: String,
        publicId: String,
      },
    },
    occupation: {
      type: {
        type: String,
        enum: ['student', 'working_professional', 'self_employed', 'other'],
        required: true,
      },
      companyName: String,
      designation: String,
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    moveInDate: {
      type: Date,
      required: true,
      index: true,
    },
    moveOutDate: {
      type: Date,
      index: true,
    },
    rentAmount: {
      type: Number,
      required: true,
      min: [0, 'Rent amount must be positive'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit must be positive'],
    },
    securityDepositPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'notice_period'],
      default: 'active',
      index: true,
    },
    noticePeriod: {
      startDate: Date,
      endDate: Date,
      reason: String,
    },
    agreement: {
      startDate: Date,
      endDate: Date,
      document: {
        url: String,
        publicId: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tenantSchema.index({ user: 1 });
tenantSchema.index({ property: 1, status: 1 });
tenantSchema.index({ room: 1 });
tenantSchema.index({ status: 1 });

// Virtual for days stayed
tenantSchema.virtual('daysStayed').get(function () {
  const end = this.moveOutDate || new Date();
  const diff = end - this.moveInDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual for months stayed
tenantSchema.virtual('monthsStayed').get(function () {
  return Math.floor(this.daysStayed / 30);
});

// Update room occupancy when tenant is added
tenantSchema.post('save', async function (doc) {
  if (doc.status === 'active') {
    const Room = mongoose.model('Room');
    const activeTenants = await mongoose
      .model('Tenant')
      .countDocuments({ room: doc.room, status: 'active' });

    await Room.findByIdAndUpdate(doc.room, {
      currentOccupancy: activeTenants,
      status: 'occupied',
    });
  }
});

// Update room occupancy when tenant status changes
tenantSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.status && update.status === 'inactive') {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      const Room = mongoose.model('Room');
      const activeTenants = await mongoose
        .model('Tenant')
        .countDocuments({ room: doc.room, status: 'active', _id: { $ne: doc._id } });

      await Room.findByIdAndUpdate(doc.room, {
        currentOccupancy: activeTenants,
        status: activeTenants === 0 ? 'available' : 'occupied',
      });
    }
  }
  next();
});

// Update room occupancy when tenant is deleted
tenantSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Room = mongoose.model('Room');
    const activeTenants = await mongoose
      .model('Tenant')
      .countDocuments({ room: doc.room, status: 'active' });

    await Room.findByIdAndUpdate(doc.room, {
      currentOccupancy: activeTenants,
      status: activeTenants === 0 ? 'available' : 'occupied',
    });
  }
});

module.exports = mongoose.model('Tenant', tenantSchema);
