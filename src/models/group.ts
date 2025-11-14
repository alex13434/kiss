import { InferSchemaType, model, Schema } from 'mongoose';

const groupSchema = new Schema(
  {
    group_id: {
      type: Number,
      index: true,
      unique: true,
      required: true,
    },
    title: String,
    username: String,
    status: { type: Number, default: 1 },
    member_count: { type: Number, default: 0 },
    ref_name: { type: String, default: 'default' },
    language_code: { type: String, default: 'ru' },
    inviter_id: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export type IGroup = InferSchemaType<typeof groupSchema>;

export const Group = model('Group', groupSchema);
