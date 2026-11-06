import { serve } from './wasmcloud/hono-adapter';
import { app } from './app';

serve(app);
