import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ status: 'error', message: 'Ключ не указан' }, { status: 400 });
    }

    // Получаем данные ключа из Redis
    const keyData: any = await redis.get(`key:${key}`);

    if (!keyData) {
      return NextResponse.json({ status: 'error', message: 'Неверный ключ' }, { status: 404 });
    }

    // Проверка: активирован ли уже ключ
    if (keyData.isUsed) {
      return NextResponse.json({ status: 'error', message: 'Ключ уже был использован' }, { status: 400 });
    }

    // Проверка срока годности самого ключа
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return NextResponse.json({ status: 'error', message: 'Срок действия ключа истек' }, { status: 403 });
    }

    // Активируем ключ (помечаем как использованный)
    keyData.isUsed = true;
    keyData.activatedAt = new Date().toISOString();
    await redis.set(`key:${key}`, keyData);

    return NextResponse.json({ 
      status: 'success', 
      message: 'Ключ успешно активирован',
      days: keyData.days // Возвращаем количество дней подписки
    });
  } catch (err) {
    return NextResponse.json({ status: 'error', message: 'Ошибка сервера' }, { status: 500 });
  }
}
