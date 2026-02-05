const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find(req.query).populate('tenant property room');
    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const complaint = await Complaint.create(req.body);
    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('tenant property room');
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
