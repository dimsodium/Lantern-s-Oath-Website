// GET  /api/progress  → the signed-in player's progress (created on first call)
// POST /api/progress  { level, score, cleared } → record a finished level attempt
import { requireUser } from './_lib/auth.js';
import { getOrCreatePlayer, recordRun, validateRun } from './_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await requireUser(req);
    if (req.method === 'GET') {
      return res.status(200).json(await getOrCreatePlayer(user));
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
      return res.status(200).json(await recordRun(user, validateRun(body)));
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error('[api/progress]', err);
    return res.status(status).json({ error: status === 500 ? 'Server error' : err.message });
  }
}
