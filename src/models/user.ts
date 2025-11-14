import { InferSchemaType, model, Schema, Types } from 'mongoose';

const currentDate = new Date();
const oneDayAgo = new Date(currentDate);
oneDayAgo.setHours(oneDayAgo.getHours() - 24);

const userSchema = new Schema(
  {
    telegram_id: {
      type: Number,
      index: true,
      unique: true,
      required: true,
    },
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    username: {
      type: String,
    },
    status: {
      type: Number,
      default: 1,
      index: true,
    },
    language_code: {
      type: String,
      index: true,
    },
    is_premium: Boolean,
    ref_name: {
      type: String,
      default: 'default',
      index: true,
    },
    balance: { type: Number, default: 0 },
    subCount: { type: Number, default: 0 },
    completeFirstSubs: { type: Boolean, default: false },
    groups: [
      {
        type: Number,
        ref: 'Group',
      },
    ],
    generations: { type: Number, default: 1 },
    usedGenCount: { type: Number, default: 0 },
    usedProviders: {
      type: Map,
      of: Number,
      default: () =>
        new Map([
          ['subgram', 0],
          ['flyer', 0],
          ['tgrass', 0],
        ]),
    },
    subscribedResources: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export type IUser = InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);
