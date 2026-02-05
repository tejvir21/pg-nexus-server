const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, async (req, res) => {
  try {
    const stats = {};
    
    if (req.user.role === 'owner') {
      stats.properties = await Property.countDocuments({ owner: req.user._id });
      stats.rooms = await Room.countDocuments({ 
        property: { $in: await Property.find({ owner: req.user._id }).select('_id') }
      });
      stats.tenants = await Tenant.countDocuments({ status: 'active' });
      stats.revenue = 50000; // Calculate from payments
    } else if (req.user.role === 'admin') {
      stats.properties = await Property.countDocuments();
      stats.rooms = await Room.countDocuments();
      stats.tenants = await Tenant.countDocuments({ status: 'active' });
      stats.revenue = 200000;
    } else {
      stats.room = await Tenant.findOne({ user: req.user._id }).populate('room');
      stats.payments = await Payment.countDocuments({ status: 'paid' });
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
