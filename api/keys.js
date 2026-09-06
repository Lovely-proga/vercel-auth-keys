import { Redis } from '@upstash/redis';
import crypto from 'crypto';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

export default async function handler(req) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // =========================================================
  // 1. ПРОВЕРКА КЛЮЧА С ДИСЦИПЛИНОЙ ЛИМИТОВ (Используется Вашим Клиентом/Софтом)
  // =========================================================
  if (action === 'verify' || req.method === 'GET') {
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || url.searchParams.get('key');

    if (!apiKey) {
      return Response.json({ valid: false, error: 'Key missing' }, { status: 400 });
    }

    const keyData = await redis.get(`authkey:${apiKey}`);

    if (!keyData) {
      return Response.json({ valid: false, error: 'Key not found or expired' }, { status: 401 });
    }

    // Проверка статуса блокировки
    if (keyData.status === 'blocked_forever') {
      return Response.json({ valid: false, error: 'Key blocked permanently' }, { status: 403 });
    }

    if (keyData.status === 'blocked_temp') {
      if (keyData.blockedUntil && Date.now() < keyData.blockedUntil) {
        const timeLeft = Math.ceil((keyData.blockedUntil - Date.now()) / 1000);
        return Response.json({ valid: false, error: `Key temp blocked. Try in ${timeLeft}s` }, { status: 403 });
      } else {
        // Время временной блокировки истекло — снимаем
        keyData.status = 'active';
        delete keyData.blockedUntil;
      }
    }

    // Проверка лимита количества использований
    if (keyData.maxUses !== null && keyData.maxUses !== undefined) {
      if (keyData.usesCount >= keyData.maxUses) {
        return Response.json({ valid: false, error: 'Usage limit reached' }, { status: 429 });
      }
      keyData.usesCount = (keyData.usesCount || 0) + 1;
      await redis.set(`authkey:${apiKey}`, keyData); // обновляем счетчик
    }

    return Response.json({ 
      valid: true, 
      label: keyData.label, 
      note: keyData.note, 
      remainingUses: keyData.maxUses ? keyData.maxUses - keyData.usesCount : 'unlimited' 
    });
  }

  // =========================================================
  // АДМИН-ДЕЙСТВИЯ (Требуют MASTER_KEY)
  // =========================================================
  const body = await req.json().catch(() => ({}));
  if (body.masterKey !== process.env.MASTER_KEY) {
    return Response.json({ error: 'Unauthorized (Invalid Master Key)' }, { status: 401 });
  }

  // 2. СОЗДАНИЕ КЛЮЧА
  if (action === 'generate') {
    const newApiKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;
    const keyData = {
      apiKey: newApiKey,
      createdAt: new Date().toISOString(),
      label: body.label || 'default',
      note: body.note || '',
      status: 'active', // active, blocked_temp, blocked_forever
      usesCount: 0,
      maxUses: body.maxUses ? parseInt(body.maxUses) : null
    };

    // Установка TTL (длительность действия в секундах)
    if (body.durationSeconds && parseInt(body.durationSeconds) > 0) {
      const ttl = parseInt(body.durationSeconds);
      await redis.set(`authkey:${newApiKey}`, keyData, { ex: ttl });
    } else {
      await redis.set(`authkey:${newApiKey}`, keyData);
    }

    return Response.json({ success: true, apiKey: newApiKey, data: keyData });
  }

  // 3. УДАЛЕНИЕ КЛЮЧА
  if (action === 'delete') {
    await redis.del(`authkey:${body.apiKey}`);
    return Response.json({ success: true, message: 'Key deleted' });
  }

  // 4. ИЗМЕНЕНИЕ СТАТУСА (Блокировка / Разблокировка)
  if (action === 'status') {
    const keyData = await redis.get(`authkey:${body.apiKey}`);
    if (!keyData) return Response.json({ error: 'Key not found' }, { status: 404 });

    keyData.status = body.status; // 'active', 'blocked_temp', 'blocked_forever'
    if (body.status === 'blocked_temp' && body.blockMinutes) {
      keyData.blockedUntil = Date.now() + parseInt(body.blockMinutes) * 60 * 1000;
    } else {
      delete keyData.blockedUntil;
    }

    await redis.set(`authkey:${body.apiKey}`, keyData);
    return Response.json({ success: true, status: keyData.status });
  }

  // 5. ИНФО О КЛЮЧЕ
  if (action === 'info') {
    const keyData = await redis.get(`authkey:${body.apiKey}`);
    if (!keyData) return Response.json({ error: 'Key not found or expired' }, { status: 404 });
    return Response.json({ success: true, data: keyData });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
