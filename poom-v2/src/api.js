const BASE = 'http://localhost:5000';

export async function saveDiaryEntry(entry) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const payload = {
    date:       entry.date || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
    time:       entry.time || now.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:true}),
    text:       entry.text       || '',
    emotion:    entry.emotion    || 'Neutral',
    emotion_kr: entry.emotion_kr || '평온',
    confidence: entry.confidence || 0,
    type:       entry.type       || 'text',
  };
  const res = await fetch(`${BASE}/diary`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return res.ok;
}

export async function getDiaryEntries(date = null) {
  const url = date ? `${BASE}/diary?date=${date}` : `${BASE}/diary`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function getDiaryDates() {
  const res = await fetch(`${BASE}/diary/dates`);
  if (!res.ok) return [];
  return res.json();
}