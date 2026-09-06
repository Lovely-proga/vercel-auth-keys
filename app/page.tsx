'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(30);

  const fetchKeys = async () => {
    const res = await fetch('/api/keys');
    const data = await res.json();
    setKeys(data);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKey = async () => {
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, days }),
    });
    setNote('');
    fetchKeys();
  };

  const deleteKey = async (key: string) => {
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    fetchKeys();
  };

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>AuthKeys Panel (без HWID)</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          placeholder="Примечание (юзер/цель)" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          style={{ padding: '8px', flex: 1 }}
        />
        <input 
          type="number" 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))} 
          style={{ padding: '8px', width: '80px' }}
        />
        <button onClick={createKey} style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Сгенерировать
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: '10px' }}>Ключ</th>
            <th style={{ padding: '10px' }}>Заметка</th>
            <th style={{ padding: '10px' }}>Статус</th>
            <th style={{ padding: '10px' }}>Дней</th>
            <th style={{ padding: '10px' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.key} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px', fontFamily: 'monospace' }}>{k.key}</td>
              <td style={{ padding: '10px' }}>{k.note || '-'}</td>
              <td style={{ padding: '10px' }}>
                {k.isUsed ? (
                  <span style={{ color: 'red' }}>Активирован</span>
                ) : (
                  <span style={{ color: 'green' }}>Активен</span>
                )}
              </td>
              <td style={{ padding: '10px' }}>{k.days} дн.</td>
              <td style={{ padding: '10px' }}>
                <button onClick={() => deleteKey(k.key)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
