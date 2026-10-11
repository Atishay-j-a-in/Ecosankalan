/**
 * routes/quizRoutes.js — minimal quiz stub.
 * The frontend references /quiz routes; this keeps the mount in app.js working
 * until a full quiz feature lands.
 */
const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Quiz service stub is running' });
});

router.get('/', protect, (req, res) => {
  res.status(200).json({ success: true, quizzes: [] });
});

module.exports = router;
