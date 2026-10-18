import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    trim: true,
    // Declares a MongoDB unique index; this is not a validation rule.
    unique: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  serviceArea: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    trim: true,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, {
  // Mongoose manages createdAt and updatedAt when documents are persisted.
  timestamps: true,
});

const Agent = mongoose.model('Agent', agentSchema);

export default Agent;
