const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: [100, 'Property name cannot exceed 100 characters'],
    },
    propertyType: {
      type: String,
      required: true,
      enum: ['boys', 'girls', 'co-living'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode'],
      },
      landmark: String,
    },
    contact: {
      personName: { type: String, required: true },
      phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
      },
      email: {
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      },
    },
    amenities: {
      wifi: { type: Boolean, default: false },
      ac: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      laundry: { type: Boolean, default: false },
      meals: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      powerBackup: { type: Boolean, default: false },
      cctv: { type: Boolean, default: false },
      refrigerator: { type: Boolean, default: false },
      tv: { type: Boolean, default: false },
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String, // For Cloudinary
        caption: String,
      },
    ],
    rules: {
      type: String,
      maxlength: [1000, 'Rules cannot exceed 1000 characters'],
    },
    totalRooms: {
      type: Number,
      default: 0,
    },
    occupiedRooms: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
propertySchema.index({ owner: 1, status: 1 });
propertySchema.index({ 'address.city': 1 });
propertySchema.index({ propertyType: 1 });

// Virtual for available rooms
propertySchema.virtual('availableRooms').get(function () {
  return this.totalRooms - this.occupiedRooms;
});

// Virtual for occupancy percentage
propertySchema.virtual('occupancyPercentage').get(function () {
  if (this.totalRooms === 0) return 0;
  return Math.round((this.occupiedRooms / this.totalRooms) * 100);
});

// Virtual populate rooms
propertySchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'property',
});

module.exports = mongoose.model('Property', propertySchema);
