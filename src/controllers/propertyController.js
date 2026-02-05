const Property = require('../models/Property');
const Room = require('../models/Room');
const { uploadFile, deleteFile } = require('../services/uploadService');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
exports.getProperties = async (req, res) => {
  try {
    let query = {};

    // If owner, only show their properties
    if (req.user.role === 'owner') {
      query.owner = req.user._id;
    }

    // Filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.city) query['address.city'] = new RegExp(req.query.city, 'i');
    if (req.query.propertyType) query.propertyType = req.query.propertyType;

    const properties = await Property.find(query)
      .populate('owner', 'name email phone')
      .sort('-createdAt');

    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Private
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('rooms');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (Owner/Admin)
exports.createProperty = async (req, res) => {
  try {
    req.body.owner = req.user._id;

    const property = await Property.create(req.body);

    res.status(201).json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner/Admin)
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner/Admin)
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Delete associated rooms
    await Room.deleteMany({ property: property._id });

    // Delete property images
    if (property.images && property.images.length > 0) {
      for (const image of property.images) {
        await deleteFile(image.publicId);
      }
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: 'Property deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload property images
// @route   POST /api/properties/:id/images
// @access  Private (Owner/Admin)
exports.uploadPropertyImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload images',
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    const images = [];

    for (const file of req.files) {
      const result = await uploadFile(file, 'properties');
      images.push({
        url: result.url,
        publicId: result.publicId,
      });
    }

    property.images.push(...images);
    await property.save();

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
