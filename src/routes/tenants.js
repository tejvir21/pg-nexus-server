const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const tenants = await Tenant.find(req.query).populate('property room user');
    res.json({ success: true, data: tenants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('property room user');
    if (!tenant) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
