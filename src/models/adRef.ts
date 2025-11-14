import { InferSchemaType, model, Schema } from 'mongoose';

const AdRefSchema = new Schema(
  {
    name: {
      index: true,
      type: String,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['mail', 'sub'],
    },
    count: { type: Number, default: 0 },
    price: Number,
  },
  {
    timestamps: true,
  }
);

export type IAdRef = InferSchemaType<typeof AdRefSchema>;

export const AdRef = model('AdRef', AdRefSchema);
