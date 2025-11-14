import 'dotenv/config';

import z from 'zod';

const configSchema = z.object({
  BOT_TOKEN: z.string(),
  BOT_USERNAME: z.string(),
  MONGO_URI: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_HOST: z.string(),
  ADMIN_ID: z.coerce.number(),
  SUBGRAM_KEY: z.string(),
  FLYER_KEY: z.string(),
  TGRASS_KEY: z.string(),
});

export default configSchema.parse(process.env);
