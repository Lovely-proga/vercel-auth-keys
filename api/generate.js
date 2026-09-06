import { Redis } from '@upstash/redis';
import crypto from 'crypto';

export const config = { runtime: 'edge' }; // Использование Edge для защиты от лимитов Vercel

const redis = Redis.fromEnv();

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { masterKey, label } = await req.json();

  // Проверка вашего мастер-пароля
  if (masterKey !== process.env.MASTER_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Генерация нового API ключа
  const newApiKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;

  // Сохраняем в базы данных Redis
  await redis.set(`authkey:${newApiKey}`, {
    createdAt: new Date().toISOString(),
    label: label || 'default_user',
    active: true
  });

  return new Response(JSON.stringify({ apiKey: newApiKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
