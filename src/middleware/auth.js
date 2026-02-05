const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

/**
 * Protect routes - requires authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from token
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists',
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

/**
 * Check if user owns the resource
 */
exports.checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.propertyId || req.params.roomId;
      const Model = require(`../models/${model}`);

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${model} not found`,
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check ownership based on model
      let isOwner = false;

      if (model === 'Property') {
        isOwner = resource.owner.toString() === req.user._id.toString();
      } else if (model === 'Room') {
        const Property = require('../models/Property');
        const property = await Property.findById(resource.property);
        isOwner = property.owner.toString() === req.user._id.toString();
      } else if (model === 'Tenant') {
        // Owner of property or tenant themselves
        const Property = require('../models/Property');
        const property = await Property.findById(resource.property);
        isOwner =
          property.owner.toString() === req.user._id.toString() ||
          resource.user.toString() === req.user._id.toString();
      } else if (model === 'Payment' || model === 'Complaint') {
        // Owner of property or tenant themselves
        const Tenant = require('../models/Tenant');
        const tenant = await Tenant.findById(resource.tenant);
        const Property = require('../models/Property');
        const property = await Property.findById(resource.property);
        isOwner =
          property.owner.toString() === req.user._id.toString() ||
          tenant.user.toString() === req.user._id.toString();
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource',
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};
