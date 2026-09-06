import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  const keys = await redis.keys('key:*');
  if (!keys.length) return NextResponse.json([]);
  
  const allData = await Promise.all(keys.map((k) => redis.get(k)));
  return NextResponse.json(allData);
}

export async function POST(req: Request) {
  const { note, days } = await req.json();
  
  const generatedKey = 'KEY-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(days));

  const keyPayload = {
    key: generatedKey,
    note: note || '',
    days: Number(days),
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    isUsed: false,
    activatedAt: null
  };

  await redis.set(`key:${generatedKey}`, keyPayload);
  return NextResponse.json(keyPayload);
}

export async function DELETE(req: Request) {
  const { key } = await req.json();
  await redis.del(`key:${key}`);
  return NextResponse.json({ status: 'ok' });
}
