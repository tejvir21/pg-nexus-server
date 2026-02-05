const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    floor: {
      type: String,
      required: true,
    },
    roomType: {
      type: String,
      required: true,
      enum: ['single', 'double', 'triple', 'four', 'dormitory'],
    },
    capacity: {
      type: Number,
      required: true,
      min: [1, 'Capacity must be at least 1'],
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    rent: {
      type: Number,
      required: [true, 'Rent is required'],
      min: [0, 'Rent must be a positive number'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit must be a positive number'],
    },
    area: {
      type: Number, // in square feet
      min: [0, 'Area must be a positive number'],
    },
    furnishing: {
      type: String,
      enum: ['fully-furnished', 'semi-furnished', 'unfurnished'],
      default: 'unfurnished',
    },
    amenities: {
      ac: { type: Boolean, default: false },
      balcony: { type: Boolean, default: false },
      attachedBathroom: { type: Boolean, default: false },
      wardrobe: { type: Boolean, default: false },
      fan: { type: Boolean, default: false },
      light: { type: Boolean, default: false },
      bed: { type: Boolean, default: false },
      table: { type: Boolean, default: false },
      chair: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'reserved'],
      default: 'available',
      index: true,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
      },
    ],
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for unique room numbers within a property
roomSchema.index({ property: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ status: 1 });

// Virtual for availability
roomSchema.virtual('isAvailable').get(function () {
  return this.currentOccupancy < this.capacity && this.status === 'available';
});

// Virtual populate tenants
roomSchema.virtual('tenants', {
  ref: 'Tenant',
  localField: '_id',
  foreignField: 'room',
});

// Update property room counts when room status changes
roomSchema.post('save', async function (doc) {
  const Property = mongoose.model('Property');
  const Room = mongoose.model('Room');

  const stats = await Room.aggregate([
    { $match: { property: doc.property } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        occupied: {
          $sum: {
            $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (stats.length > 0) {
    await Property.findByIdAndUpdate(doc.property, {
      totalRooms: stats[0].total,
      occupiedRooms: stats[0].occupied,
    });
  }
});

// Also update on delete
roomSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Property = mongoose.model('Property');
    const Room = mongoose.model('Room');

    const stats = await Room.aggregate([
      { $match: { property: doc.property } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          occupied: {
            $sum: {
              $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const total = stats.length > 0 ? stats[0].total : 0;
    const occupied = stats.length > 0 ? stats[0].occupied : 0;

    await Property.findByIdAndUpdate(doc.property, {
      totalRooms: total,
      occupiedRooms: occupied,
    });
  }
});

module.exports = mongoose.model('Room', roomSchema);
