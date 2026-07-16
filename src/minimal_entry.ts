import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './lib/types';
import constitution from './routes/constitution';

const app = new Hono<{ Bindings: Bindings }>();
app.use('/api/*', cors());
app.route('/api/v1', constitution);
app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/', (c) => c.html('<h1>SGTX v11.1</h1>'));
app.get('/:path{.+}', (c) => c.redirect('/'));

export default app;
