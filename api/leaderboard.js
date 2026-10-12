// GET /api/leaderboard → top 10 Wardens by best score (public; no emails exposed)
import { topPlayers } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ players: await topPlayers(10) });
  } catch (err) {
    console.error('[api/leaderboard]', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
