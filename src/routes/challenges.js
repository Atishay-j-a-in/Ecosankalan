const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Challenge = require('../models/Challenge');
const ChallengeProgress = require('../models/ChallengeProgress');
const { issueReward } = require('../services/rewardEngine');

const router = express.Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const startOfCurrentWeekIST = (now = new Date()) => {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const day = ist.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  ist.setUTCDate(ist.getUTCDate() - diffToMonday);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
};

// Snap any date to Monday 00:00 IST of its week, so admin-created
// challenges always line up with the week buckets /active queries.
const snapToWeekMondayIST = (date) => startOfCurrentWeekIST(date);

const validateTasks = (tasks) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 'At least one task is required';
  }
  for (const task of tasks) {
    if (!task || !task.action || !String(task.action).trim()) {
      return 'Every task needs an action';
    }
    const target = Number(task.targetCount);
    if (!Number.isFinite(target) || target < 1) {
      return 'Every task needs a targetCount of at least 1';
    }
  }
  return null;
};

const normaliseTasks = (tasks) =>
  tasks.map((task) => ({
    action: String(task.action).trim(),
    targetCount: Number(task.targetCount),
    category: task.category ? String(task.category).trim() : undefined,
  }));

const endOfWeekIST = (weekStartDate) =>
  new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

const initialProgress = (challenge) =>
  challenge.tasks.map((task, taskIndex) => ({
    taskIndex,
    currentCount: 0,
    completed: false,
  }));

router.use(protect);

router.get('/active', async (req, res) => {
  try {
    const weekStartDate = startOfCurrentWeekIST();
    const challenges = await Challenge.find({ isActive: true, weekStartDate }).lean();
    const progressRows = await ChallengeProgress.find({
      userId: req.user.userId,
      weekStartDate,
      challengeId: { $in: challenges.map((challenge) => challenge._id) },
    }).lean();

    const progressByChallenge = new Map(
      progressRows.map((progress) => [String(progress.challengeId), progress])
    );

    res.status(200).json(challenges.map((challenge) => ({
      ...challenge,
      progress: progressByChallenge.get(String(challenge._id)) || {
        taskProgress: initialProgress(challenge),
        allCompleted: false,
        rewardIssued: false,
      },
      deadline: endOfWeekIST(weekStartDate),
    })));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load active challenges' });
  }
});

router.post('/:id/progress', async (req, res) => {
  try {
    const { action, category, count = 1 } = req.body;
    const incrementBy = Number(count);
    const weekStartDate = startOfCurrentWeekIST();
    const challenge = await Challenge.findOne({
      _id: req.params.id,
      isActive: true,
      weekStartDate,
    });

    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });
    if (!action || !Number.isFinite(incrementBy) || incrementBy <= 0) {
      return res.status(400).json({ success: false, message: 'action and positive count are required' });
    }

    let progress = await ChallengeProgress.findOne({
      userId: req.user.userId,
      challengeId: challenge._id,
      weekStartDate,
    });

    if (!progress) {
      progress = await ChallengeProgress.create({
        userId: req.user.userId,
        challengeId: challenge._id,
        weekStartDate,
        taskProgress: initialProgress(challenge),
      });
    }

    challenge.tasks.forEach((task, taskIndex) => {
      const categoryMatches = !task.category || !category || task.category === category;
      if (task.action === action && categoryMatches) {
        const taskProgress = progress.taskProgress.find((item) => item.taskIndex === taskIndex);
        taskProgress.currentCount = Math.min(task.targetCount, taskProgress.currentCount + incrementBy);
        taskProgress.completed = taskProgress.currentCount >= task.targetCount;
      }
    });

    progress.allCompleted = progress.taskProgress.every((item) => item.completed);
    if (progress.allCompleted && !progress.completedAt) progress.completedAt = new Date();
    await progress.save();

    let reward = null;
    if (progress.allCompleted && !progress.rewardIssued) {
      reward = await issueReward(req.user.userId, challenge._id, weekStartDate);
      progress = await ChallengeProgress.findById(progress._id);
    }

    res.status(200).json({ progress, reward });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update challenge progress' });
  }
});

// ── Admin: challenge management (mirrors reference admin contract) ──
// All routes below require the admin role.

router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .sort({ weekStartDate: -1, createdAt: -1 })
      .lean();
    res.status(200).json(challenges);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load challenges' });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, tasks, rewardPoints = 0, rewardVoucherPartner, weekStartDate } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'title and description are required' });
    }
    const tasksError = validateTasks(tasks);
    if (tasksError) {
      return res.status(400).json({ success: false, message: tasksError });
    }
    const parsedWeek = weekStartDate ? new Date(weekStartDate) : startOfCurrentWeekIST();
    if (Number.isNaN(parsedWeek.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid weekStartDate' });
    }
    const reward = Number(rewardPoints);
    if (!Number.isFinite(reward) || reward < 0) {
      return res.status(400).json({ success: false, message: 'rewardPoints must be ≥ 0' });
    }

    const challenge = await Challenge.create({
      title,
      description,
      tasks: normaliseTasks(tasks),
      rewardPoints: reward,
      rewardVoucherPartner: rewardVoucherPartner || undefined,
      weekStartDate: snapToWeekMondayIST(parsedWeek),
    });

    res.status(201).json({ success: true, challenge });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid challenge data',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create challenge' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'rewardPoints', 'rewardVoucherPartner', 'isActive'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.tasks !== undefined) {
      const tasksError = validateTasks(req.body.tasks);
      if (tasksError) {
        return res.status(400).json({ success: false, message: tasksError });
      }
      updates.tasks = normaliseTasks(req.body.tasks);
    }
    if (req.body.weekStartDate !== undefined) {
      const parsedWeek = new Date(req.body.weekStartDate);
      if (Number.isNaN(parsedWeek.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid weekStartDate' });
      }
      updates.weekStartDate = snapToWeekMondayIST(parsedWeek);
    }
    if (updates.rewardPoints !== undefined) {
      const reward = Number(updates.rewardPoints);
      if (!Number.isFinite(reward) || reward < 0) {
        return res.status(400).json({ success: false, message: 'rewardPoints must be ≥ 0' });
      }
      updates.rewardPoints = reward;
    }

    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    res.status(200).json({ success: true, challenge });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid challenge data',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to update challenge' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    res.status(200).json({ success: true, message: 'Challenge deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete challenge' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const currentWeek = startOfCurrentWeekIST();
    const start = new Date(currentWeek.getTime() - 7 * 7 * 24 * 60 * 60 * 1000);
    const progressRows = await ChallengeProgress.find({
      userId: req.user.userId,
      weekStartDate: { $gte: start, $lte: currentWeek },
    }).populate('challengeId', 'title tasks').sort({ weekStartDate: -1 }).lean();

    const grouped = new Map();
    progressRows.forEach((progress) => {
      const key = progress.weekStartDate.toISOString();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        challengeTitle: progress.challengeId?.title || 'Challenge',
        status: progress.allCompleted ? 'completed' : 'missed',
        rewardReceived: progress.rewardIssued,
        progressAtEnd: progress.taskProgress,
      });
    });

    res.status(200).json(
      Array.from(grouped.entries())
        .slice(0, 8)
        .map(([weekStartDate, challenges]) => ({ weekStartDate, challenges }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load challenge history' });
  }
});

module.exports = router;
