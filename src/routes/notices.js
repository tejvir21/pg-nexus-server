const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const notices = await Notice.getActiveNotices(req.query);
    res.json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const notice = await Notice.create(req.body);
    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate('createdBy property');
    if (!notice) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: notice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
