const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const uploadBinPhoto = require('../middleware/binPhotoUpload');
const getCloudinary = require('../config/cloudinary');
const Bin = require('../models/Bin');
const BinReport = require('../models/BinReport');

const router = express.Router();

const VALID_BIN_TYPES = ['plastic', 'organic', 'eWaste', 'metal', 'paper', 'general'];

// Upload the mandatory site photo: Cloudinary when configured,
// otherwise an inline data-URL so the flow works with zero extra setup.
const resolvePhotoUrl = async (file, userId) => {
  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  if (hasCloudinary) {
    const cloudinary = getCloudinary();
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.CLOUDINARY_BIN_FOLDER || 'ecosankalan/bins',
      public_id: `bin_${userId}_${Date.now()}`,
      resource_type: 'image',
    });
    return result.secure_url;
  }
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

const parseTypes = (value) => {
  if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const distanceMetres = ([lng1, lat1], [lng2, lat2]) => {
  const radius = 6371000;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// FR-12: GET /bins?lat&lng&radius — sorted nearest-first using $near + $2dsphere
router.get('/', async (req, res) => {
  try {
    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    const rawRadius = toNumber(req.query.radius) ?? 5000;
    const radius = Math.min(20000, Math.max(100, rawRadius));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    if (lat === null || lng === null) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'lat must be -90..90 and lng -180..180' });
    }

    const userPoint = [lng, lat];
    const query = Bin.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: userPoint },
          $maxDistance: radius,
        },
      },
    });
    // Support mocked models in tests (plain arrays) as well as real Mongoose queries.
    const limited = query && typeof query.limit === 'function' ? query.limit(limit) : query;
    const bins = limited && typeof limited.lean === 'function' ? await limited.lean() : await limited;

    res.status(200).json(bins.map((bin) => ({
      ...bin,
      distanceMetres: distanceMetres(userPoint, bin.location.coordinates),
    })));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load bins' });
  }
});

// FR-11: POST /bins — Admin-only bin creation
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, address, location, types, capacityStatus } = req.body;

    if (!name || !address || !location?.coordinates || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ success: false, message: 'name, address, location.coordinates and types are required' });
    }
    const coords = location.coordinates.map(Number);
    if (
      coords.length !== 2 ||
      !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) ||
      coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90
    ) {
      return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
    }

    const bin = await Bin.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: coords,
      },
      types,
      capacityStatus,
      createdBy: req.user.userId,
    });

    res.status(201).json(bin);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to create bin' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const allowed = ['name', 'address', 'types', 'capacityStatus'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.location?.coordinates !== undefined) {
      const coords = req.body.location.coordinates.map(Number);
      if (
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) ||
        coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90
      ) {
        return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
      }
      updates.location = { type: 'Point', coordinates: coords };
    }
    const bin = await Bin.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!bin) return res.status(404).json({ success: false, message: 'Bin not found' });
    res.status(200).json(bin);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update bin' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const bin = await Bin.findByIdAndDelete(req.params.id);
    if (!bin) return res.status(404).json({ success: false, message: 'Bin not found' });
    res.status(200).json({ success: true, message: 'Bin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete bin' });
  }
});

// ── Citizen bin reports: photo + live location mandatory, admin reviews ──

// POST /bins/report — any logged-in user reports a bin (photo + live GPS required)
router.post('/report', protect, uploadBinPhoto, async (req, res) => {
  try {
    const { name, address = '', description = '' } = req.body;
    const types = parseTypes(req.body.types);
    const lat = toNumber(req.body.lat);
    const lng = toNumber(req.body.lng);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A site photo is required. Attach it as "photo".' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Bin name is required.' });
    }
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Live location (valid lat/lng) is required.' });
    }
    if (types.length === 0 || !types.every((t) => VALID_BIN_TYPES.includes(t))) {
      return res.status(400).json({ success: false, message: `types must be a non-empty subset of: ${VALID_BIN_TYPES.join(', ')}` });
    }

    const photoUrl = await resolvePhotoUrl(req.file, req.user.userId);

    const report = await BinReport.create({
      name: name.trim(),
      address: String(address || '').trim(),
      location: { type: 'Point', coordinates: [lng, lat] },
      types,
      photoUrl,
      description: String(description || '').trim(),
      requestedBy: req.user.userId,
    });

    res.status(201).json({ success: true, message: 'Bin report submitted for admin review.', report });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to submit bin report' });
  }
});

// GET /bins/report/mine — my own reports (newest first)
router.get('/report/mine', protect, async (req, res) => {
  try {
    const reports = await BinReport.find({ requestedBy: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load your bin reports' });
  }
});

// GET /bins/requests?status=pending|approved|rejected|all — admin review queue
router.get('/requests', protect, authorize('admin'), async (req, res) => {
  try {
    const status = (req.query.status || 'pending').toLowerCase();
    const filter = status === 'all' ? {} : { status };
    if (filter.status && !['pending', 'approved', 'rejected'].includes(filter.status)) {
      return res.status(400).json({ success: false, message: 'status must be pending, approved, rejected, or all' });
    }
    const reports = await BinReport.find(filter)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load bin requests' });
  }
});

// POST /bins/requests/:id/approve — admin approves: creates the real Bin
router.post('/requests/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await BinReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Bin report not found' });
    if (report.status !== 'pending') {
      return res.status(409).json({ success: false, message: `Report is already ${report.status}` });
    }

    const bin = await Bin.create({
      name: report.name,
      address: report.address || 'Location pinned by citizen report',
      location: report.location,
      types: report.types,
      capacityStatus: 'low',
      createdBy: req.user.userId,
    });

    report.status = 'approved';
    report.reviewNote = String(req.body?.note || '').trim();
    report.reviewedBy = req.user.userId;
    report.reviewedAt = new Date();
    report.resultingBin = bin._id;
    await report.save();

    res.status(200).json({ success: true, message: 'Bin approved and published.', report, bin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to approve bin report' });
  }
});

// POST /bins/requests/:id/reject — admin rejects with an optional reason
router.post('/requests/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await BinReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Bin report not found' });
    if (report.status !== 'pending') {
      return res.status(409).json({ success: false, message: `Report is already ${report.status}` });
    }

    report.status = 'rejected';
    report.reviewNote = String(req.body?.reason || req.body?.note || '').trim();
    report.reviewedBy = req.user.userId;
    report.reviewedAt = new Date();
    await report.save();

    res.status(200).json({ success: true, message: 'Bin report rejected.', report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reject bin report' });
  }
});

module.exports = router;
