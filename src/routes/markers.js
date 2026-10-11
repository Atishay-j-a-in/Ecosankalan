/**
 * routes/markers.js — map markers from the DB (bins + events).
 * The frontend calls this instead of hitting OSM directly.
 */
const express = require('express');
const Bin = require('../models/Bin');
const Event = require('../models/Event');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [bins, events] = await Promise.all([
      Bin.find({ isActive: { $ne: false } }).limit(500).lean(),
      Event.find({ isCancelled: { $ne: true } }).limit(200).lean(),
    ]);
    res.status(200).json({ success: true, bins, events });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load markers' });
  }
});

module.exports = router;
