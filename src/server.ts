import { serve } from '@hono/node-server';
import { createApp } from './app';

const app = createApp();

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
