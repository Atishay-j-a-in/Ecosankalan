/**
 * routes/leaderboard.js — PUBLIC global dashboard + leaderboard.
 * No auth required: everyone (even logged-out visitors) can see
 * platform impact, top eco-warriors, and what every feature does.
 */
const express = require('express');
const User = require('../models/User');
const WasteLog = require('../models/WasteLog');
const Bin = require('../models/Bin');
const Event = require('../models/Event');
const Voucher = require('../models/Voucher');
const ChallengeProgress = require('../models/ChallengeProgress');

const router = express.Router();

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

// Static catalogue of everything the app offers (shown on the public board).
const FEATURES = [
  { key: 'waste-log', icon: 'delete_sweep', title: 'Waste Logging', desc: 'Log plastic, paper, metal, organic & e-waste by weight and earn eco-points per kg.' },
  { key: 'ai-scan', icon: 'photo_camera', title: 'AI Waste Scan', desc: 'Snap a photo of any item — AI classifies the material and tells you how to dispose of it.' },
  { key: 'bins', icon: 'delete', title: 'Nearby Bins', desc: 'Find the closest recycling bins on a live map, or report a new bin with a photo + GPS.' },
  { key: 'events', icon: 'event', title: 'Community Events', desc: 'Discover clean-up drives and workshops near you, RSVP and earn bonus points.' },
  { key: 'challenges', icon: 'emoji_events', title: 'Weekly Challenges', desc: 'Take on zero-plastic weeks and compost missions with per-task progress tracking.' },
  { key: 'vouchers', icon: 'confirmation_number', title: 'Reward Vouchers', desc: 'Redeem eco-points for partner discounts and track every voucher you unlock.' },
  { key: 'shop', icon: 'shopping_bag', title: 'Eco Shop', desc: 'Browse sustainable partner products and buy greener alternatives.' },
  { key: 'learn', icon: 'school', title: 'Learn & Quiz', desc: 'Bite-size lessons and quizzes that turn waste knowledge into points.' },
];

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 20));

    const [leaders, totalUsers, wasteTotals, co2Totals, totalBins, totalEvents, vouchersIssued, totalChallengeCompletions] =
      await Promise.all([
        User.find({})
          .select('name avatar totalPointsEarned ecoPoints totalWasteLogged co2Saved badges createdAt')
          .sort({ totalPointsEarned: -1 })
          .limit(limit)
          .lean(),
        User.countDocuments(),
        WasteLog.aggregate([{ $group: { _id: null, totalKg: { $sum: '$quantity' } } }]),
        WasteLog.aggregate([{ $group: { _id: null, totalCo2: { $sum: '$co2Saved' } } }]),
        Bin.countDocuments({ isActive: { $ne: false } }),
        Event.countDocuments({ isCancelled: { $ne: true } }),
        Voucher.countDocuments({ assignedTo: { $ne: null } }),
        ChallengeProgress.countDocuments({ allCompleted: true }),
      ]);

    const ranked = leaders.map((user, index) => ({
      rank: index + 1,
      _id: user._id,
      name: user.name,
      avatar: user.avatar || null,
      totalPointsEarned: user.totalPointsEarned || 0,
      ecoPoints: user.ecoPoints || 0,
      totalWasteKg: round2(user.totalWasteLogged || 0),
      co2Saved: round2(user.co2Saved || 0),
      badges: Array.isArray(user.badges) ? user.badges.length : 0,
    }));

    res.status(200).json({
      success: true,
      platform: {
        totalUsers,
        totalWasteKg: round2(wasteTotals[0]?.totalKg),
        totalCo2Saved: round2(co2Totals[0]?.totalCo2),
        totalBins,
        totalEvents,
        vouchersIssued,
        totalChallengeCompletions,
      },
      leaders: ranked,
      features: FEATURES,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
});

module.exports = router;
