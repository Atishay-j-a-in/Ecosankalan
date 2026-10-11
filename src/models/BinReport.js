const mongoose = require('mongoose');

// A citizen-reported bin: photo + live GPS are mandatory at submit time,
// an admin then approves (creates a real Bin) or rejects it.
const binReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Bin name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Live location coordinates are required'],
        validate: {
          validator(coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90 && coords[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },
    types: {
      type: [{
        type: String,
        enum: ['plastic', 'organic', 'eWaste', 'metal', 'paper', 'general'],
      }],
      required: [true, 'At least one bin type is required'],
      validate: {
        validator(types) {
          return Array.isArray(types) && types.length > 0;
        },
        message: 'At least one bin type is required',
      },
    },
    // Mandatory site photo (Cloudinary URL, or inline data-URL when Cloudinary is not configured)
    photoUrl: {
      type: String,
      required: [true, 'A site photo is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Filled in when an admin reviews the report
    reviewNote: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // The Bin created on approval (if any)
    resultingBin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin',
      default: null,
    },
  },
  { timestamps: true }
);

binReportSchema.index({ location: '2dsphere' });
binReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BinReport', binReportSchema);
