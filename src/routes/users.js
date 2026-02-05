const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), async (req, res) => {
  const users = await User.find();
  res.json({ success: true, data: users });
});

module.exports = router;
