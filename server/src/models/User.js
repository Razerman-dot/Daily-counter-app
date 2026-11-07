import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../utils/date.js';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never returned by default queries; must be explicitly selected.
    passwordHash: { type: String, required: true, select: false },
    // IANA timezone that defines where the user's "day" starts and ends.
    timezone: {
      type: String,
      default: DEFAULT_TIMEZONE,
      validate: { validator: isValidTimeZone, message: 'Invalid timezone' },
    },
  },
  { timestamps: true }
);

/** Hash and set a new password. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
};

/** Constant-time password check. Requires passwordHash to be selected. */
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** Public, safe representation sent to the client. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    timezone: this.timezone,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
