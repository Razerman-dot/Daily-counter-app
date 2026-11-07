import mongoose from 'mongoose';

/**
 * A named thing the user counts ("Push-ups", "Customers served", ...).
 * Each counter has its own independent daily history (see DailyCount).
 */
const counterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
  },
  { timestamps: true }
);

counterSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
