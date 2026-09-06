import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

const redis = Redis.fromEnv();

export default async function handler(req) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return new Response(JSON.stringify({ valid: false, error: 'Key is missing' }), { status: 400 });
  }

  // Получаем данные ключа из базы
  const keyData = await redis.get(`authkey:${apiKey}`);

  if (!keyData || !keyData.active) {
    return new Response(JSON.stringify({ valid: false, error: 'Invalid or revoked key' }), { status: 401 });
  }

  return new Response(JSON.stringify({ valid: true, user: keyData.label }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
