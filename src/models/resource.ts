import { InferSchemaType, model, Schema } from 'mongoose';

const resourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  link: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['channel', 'bot'],
  },
  token: { type: String, default: '' },
  subscribes: { type: Number, default: 0 },
  maxSubscribes: { type: Number, default: 0 },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export type IResource = InferSchemaType<typeof resourceSchema>;

export const Resource = model('Resource', resourceSchema);
