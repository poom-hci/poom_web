import { useState, useEffect, useRef } from 'react';
import './EmotionDiary.css';
import { saveDiaryEntry, getDiaryEntries, getDiaryDates } from '../api';

const EMOTION_META = {
  Sadness:   { label: '슬픔',  color: '#E8704A', bg: '#FDF0EB' },
  Anger:     { label: '분노',  color: '#D63031', bg: '#FFE9E8' },
  Anxiety:   { label: '불안',  color: '#A29BFE', bg: '#F0EEFF' },
  Neutral:   { label: '평온',  color: '#4CAF7D', bg: '#EBF7F1' },
  Happiness: { label: '행복',  color: '#FDCB6E', bg: '#FFF9EC' },
  sad:       { label: '슬픔',  color: '#E8704A', bg: '#FDF0EB' },
  calm:      { label: '평온',  color: '#4CAF7D', bg: '#EBF7F1' },
  recovery:  { label: '회복',  color: '#6B9FD4', bg: '#EBF3FB' },
};

const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DOW_KR   = ['일','월','화','수','목','금','토'];

/* ── 일기 카드 ── */
function DiaryCard({ entry }) {
  const em = EMOTION_META[entry.emotion] || EMOTION_META.Neutral;
  return (
    <div className="diary-card">
      <div className="diary-card-top">
        <p className="diary-time">{entry.time}</p>
        <div className="emotion-badge" style={{ color: em.color, background: em.bg }}>
          <span>{em.label}</span>
          {entry.confidence > 0 && (
            <span className="diary-conf">{Math.round(entry.confidence * 100)}%</span>
          )}
        </div>
      </div>
      <p className="diary-text">{entry.text || '(내용 없음)'}</p>
      <div className="diary-type-tag">
        {entry.type === 'voice' ? '🎤 음성 기록' : '✏️ 텍스트 기록'}
      </div>
    </div>
  );
}

/* ── 월간 달력 ── */
function MonthCalendar({ entryDates, selectedDay, onSelectDay }) {
  const now  = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayStr    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => month === 0  ? (setYear(y=>y-1), setMonth(11)) : setMonth(m=>m-1);
  const nextMonth = () => month === 11 ? (setYear(y=>y+1), setMonth(0))  : setMonth(m=>m+1);
  const makeDate  = d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div className="month-cal-wrap">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-title">{year}년 {MONTH_KR[month]}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>
      <div className="cal-grid">
        {DOW_KR.map(d => (
          <div key={d} className="cal-cell cal-dow"
            style={d==='일'?{color:'#E8704A'}:d==='토'?{color:'#6B9FD4'}:{}}>
            {d}
          </div>
        ))}
        {Array(firstDow).fill(null).map((_,i) => (
          <div key={`e${i}`} className="cal-cell cal-empty" />
        ))}
        {Array(daysInMonth).fill(null).map((_,i) => {
          const d        = i + 1;
          const dateStr  = makeDate(d);
          const isToday  = dateStr === todayStr;
          const hasEntry = entryDates.has(dateStr);
          const isSel    = selectedDay === dateStr;
          const dow      = (firstDow + i) % 7;
          return (
            <button key={d}
              className={['cal-cell cal-day',isToday?'today':'',hasEntry?'has-entry':'',isSel?'selected':''].filter(Boolean).join(' ')}
              style={!isSel&&!isToday?(dow===0?{color:'#E8704A'}:dow===6?{color:'#6B9FD4'}:{}):{}}
              onClick={() => onSelectDay(dateStr)}>
              <span className="cal-num">{d}</span>
              {hasEntry && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── 주간 감정 막대그래프 ── */
function WeekChart({ entries }) {
  const colors = { Sadness:'#E8704A',Anger:'#D63031',Anxiety:'#A29BFE',Neutral:'#4CAF7D',Happiness:'#FDCB6E' };
  const now  = new Date();
  const days = Array(7).fill(null).map((_, i) => {
    const d   = new Date(now); d.setDate(now.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const day = ['일','월','화','수','목','금','토'][d.getDay()];
    const de  = entries.filter(e => e.date === key);
    const emo = de.length > 0 ? de[0].emotion : null;
    return { day, emotion: emo, h: emo ? 60 + Math.min(de.length*10,30) : 0 };
  });
  return (
    <div className="week-chart-wrap">
      <p className="week-chart-title">최근 7일 감정 흐름</p>
      <div className="week-chart">
        {days.map((b,i) => (
          <div key={i} className="chart-col">
            <div className="chart-bar-wrap">
              <div className="chart-bar" style={{
                height: b.h ? `${b.h}%` : '4px',
                background: b.emotion ? (colors[b.emotion]||'#ccc') : 'var(--border)',
                opacity: b.emotion ? 1 : 0.4,
              }}/>
            </div>
            <span className="chart-day">{b.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 녹음 모달 ── */
function RecordModal({ petName, onClose, onSaved }) {
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result,     setResult]     = useState(null);
  const [saved,      setSaved]      = useState(false);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = sendAudio;
      mr.start();
      setRecording(true);
    } catch { setResult({ text: '마이크 권한이 필요해요' }); }
  }

  function stopRec() {
    mediaRef.current?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    setRecording(false);
    setProcessing(true);
  }

  async function sendAudio() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    try {
      const res  = await fetch('http://localhost:5000/stt', { method:'POST', body: form });
      setResult(await res.json());
    } catch { setResult({ text: '서버 연결 안됨' }); }
    setProcessing(false);
  }

  const handleSave = async () => {
    if (!result) return;
    await saveDiaryEntry({ ...result, type: 'voice' });
    setSaved(true);
    onSaved?.();
  };

  const em = result?.emotion ? (EMOTION_META[result.emotion] || EMOTION_META.Neutral) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="record-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle2" />
        <p className="record-modal-title">오늘 하루 기록하기</p>
        <p className="record-modal-sub">{petName}에 대한 감정을 자유롭게 말해보세요</p>
        <button className={"rec-mic-btn" + (recording ? " rec-on" : "")}
          onClick={recording ? stopRec : startRec} disabled={processing}>
          {processing ? <span className="rec-dots">●●●</span> : <span className="rec-icon">🎤</span>}
          {recording && <span className="rec-ring" />}
        </button>
        <p className="rec-hint">{processing ? '분석 중...' : recording ? '탭해서 중지' : '탭해서 녹음'}</p>
        {result && (
          <div className="rec-result">
            {result.text && <p className="rec-result-text">{result.text}</p>}
            {em && (
              <div className="emotion-result-box" style={{background:em.bg, marginBottom:12}}>
                <span className="emo-res-label">감정</span>
                <span className="emo-res-tag" style={{color:em.color}}>{em.label}</span>
                <span className="emo-res-conf">{Math.round((result.confidence||0)*100)}%</span>
              </div>
            )}
            {!saved
              ? <button className="rec-save-btn" onClick={handleSave}>저장하기</button>
              : <p className="talk-saved" style={{textAlign:'center'}}>✓ 저장되었어요</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function EmotionDiary({ petName = '우리 아이', refreshKey = 0 }) {
  const now      = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const [allEntries,  setAllEntries]  = useState([]);
  const [entryDates,  setEntryDates]  = useState(new Set());
  const [dayEntries,  setDayEntries]  = useState([]);
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [showRecord,  setShowRecord]  = useState(false);
  const [loading,     setLoading]     = useState(false);

  /* 전체 항목 + 날짜 목록 로딩 */
  const loadAll = async () => {
    setLoading(true);
    try {
      const [entries, dates] = await Promise.all([
        getDiaryEntries(),
        getDiaryDates(),
      ]);
      setAllEntries(entries);
      setEntryDates(new Set(dates));
    } catch (e) {
      console.warn('서버 연결 안됨, 로컬 캐시 사용');
    }
    setLoading(false);
  };

  /* 날짜 선택 시 해당 날 항목 로딩 */
  const loadDay = async (date) => {
    try {
      const entries = await getDiaryEntries(date);
      setDayEntries(entries);
    } catch {
      setDayEntries(allEntries.filter(e => e.date === date));
    }
  };

  useEffect(() => { loadAll(); }, [refreshKey]);
  useEffect(() => { loadDay(selectedDay); }, [selectedDay, refreshKey]);

  const fmtSelected = () => {
    const d = new Date(selectedDay + 'T00:00:00');
    return `${d.getMonth()+1}월 ${d.getDate()}일`;
  };

  return (
    <div className="diary-wrap">
      <div className="diary-header">
        <h2 className="diary-title">감정 일기</h2>
        <p className="diary-sub">날짜를 선택해 기록을 확인해요</p>
      </div>

      <MonthCalendar
        entryDates={entryDates}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <p className="diary-day-label">
        {fmtSelected()} 기록
        {loading && <span style={{fontSize:11,color:'var(--text3)',marginLeft:8}}>로딩 중...</span>}
      </p>
      <div className="diary-list">
        {dayEntries.length > 0
          ? dayEntries.map(e => <DiaryCard key={e.id} entry={e} />)
          : <div className="diary-empty">이 날의 기록이 없어요 🌿</div>}
      </div>

      <WeekChart entries={allEntries} />
      <div style={{height:90}} />

      <button className="float-rec-btn" onClick={() => setShowRecord(true)}>🎤</button>
      {showRecord && (
        <RecordModal
          petName={petName}
          onClose={() => setShowRecord(false)}
          onSaved={() => { loadAll(); loadDay(selectedDay); }}
        />
      )}
    </div>
  );
}