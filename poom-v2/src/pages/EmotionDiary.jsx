import { useState, useRef } from 'react';
import './EmotionDiary.css';

const EMOTION_META = {
  sad:      { label: '슬픔',  color: '#E8704A', bg: '#FDF0EB', level: 3 },
  calm:     { label: '평온',  color: '#4CAF7D', bg: '#EBF7F1', level: 2 },
  recovery: { label: '회복',  color: '#6B9FD4', bg: '#EBF3FB', level: 1 },
};

const SAMPLE_ENTRIES = [
  {
    id: 1, date: '2026-05-27', time: '오후 11:20', emotion: 'sad', duration: '0:47',
    text: '오늘 많이 보고 싶었어. 네 밥그릇 치우다가 울었어. 근데 그냥 그래도 괜찮은 것 같아...',
    waveform: [0.3,0.5,0.8,0.6,1.0,0.7,0.9,0.5,0.4,0.6,0.8,0.7,0.5,0.3,0.6,0.9,0.7,0.4],
  },
  {
    id: 2, date: '2026-05-27', time: '오전 8:05', emotion: 'calm', duration: '0:23',
    text: '아침에 일어나서 네 사진 봤어. 오늘은 좀 괜찮을 것 같은 기분이야.',
    waveform: [0.4,0.6,0.5,0.7,0.5,0.6,0.4,0.5,0.7,0.6,0.5,0.4,0.6,0.5,0.7,0.6,0.4,0.5],
  },
];

// 기록이 있는 날짜 (실제 연동 시 서버에서 받아오면 됩니다)
const ENTRY_DATES = new Set([
  '2026-05-22','2026-05-23','2026-05-24','2026-05-27',
]);

const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DOW_KR   = ['일','월','화','수','목','금','토'];

/* ── 음성 파형 플레이어 ── */
function AudioPlayer({ waveform, duration }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="audio-player">
      <button className="play-btn" onClick={() => setPlaying(p => !p)}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="waveform">
        {waveform.map((h, i) => (
          <div key={i} className={"wf-bar" + (playing ? " anim" : "")}
            style={{ height: `${h * 28}px`, animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <span className="audio-dur">{duration}</span>
    </div>
  );
}

/* ── 일기 카드 (AI 분석 없음) ── */
function DiaryCard({ entry }) {
  const em = EMOTION_META[entry.emotion];
  return (
    <div className="diary-card">
      <p className="diary-time">{entry.time}</p>
      <div className="emotion-badge" style={{ color: em.color, background: em.bg }}>
        <span>⊙</span>
        <span>{em.label} 단계 {em.level}</span>
      </div>
      <p className="diary-text">{entry.text}</p>
      <AudioPlayer waveform={entry.waveform} duration={entry.duration} />
    </div>
  );
}

/* ── 2026년 월간 달력 ── */
function MonthCalendar({ entryDates, selectedDay, onSelectDay }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const todayStr    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const firstDow    = new Date(year, month, 1).getDay();     // 0=일
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => month === 0 ? (setYear(y => y-1), setMonth(11)) : setMonth(m => m-1);
  const nextMonth = () => month === 11 ? (setYear(y => y+1), setMonth(0)) : setMonth(m => m+1);

  const makeDate = d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div className="month-cal-wrap">
      {/* 헤더 */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-title">{year}년 {MONTH_KR[month]}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div className="cal-grid">
        {DOW_KR.map(d => (
          <div key={d} className="cal-cell cal-dow"
            style={d==='일' ? {color:'#E8704A'} : d==='토' ? {color:'#6B9FD4'} : {}}>
            {d}
          </div>
        ))}

        {/* 빈 칸 */}
        {Array(firstDow).fill(null).map((_, i) => (
          <div key={`e${i}`} className="cal-cell cal-empty" />
        ))}

        {/* 날짜 칸 */}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const d       = i + 1;
          const dateStr = makeDate(d);
          const isToday    = dateStr === todayStr;
          const hasEntry   = entryDates.has(dateStr);
          const isSelected = selectedDay === dateStr;
          const dow        = (firstDow + i) % 7;
          return (
            <button key={d}
              className={[
                'cal-cell cal-day',
                isToday    ? 'today'     : '',
                hasEntry   ? 'has-entry' : '',
                isSelected ? 'selected'  : '',
              ].filter(Boolean).join(' ')}
              style={!isSelected && !isToday ? (dow===0 ? {color:'#E8704A'} : dow===6 ? {color:'#6B9FD4'} : {}) : {}}
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
function WeekChart() {
  const bars = [
    { day:'월', emotion:'sad',  h:80 },
    { day:'화', emotion:'sad',  h:70 },
    { day:'수', emotion:'sad',  h:65 },
    { day:'목', emotion:null,   h:0  },
    { day:'금', emotion:null,   h:0  },
    { day:'토', emotion:null,   h:0  },
    { day:'일', emotion:'calm', h:40 },
  ];
  const colors = { sad:'#E8704A', calm:'#4CAF7D', recovery:'#6B9FD4' };
  return (
    <div className="week-chart-wrap">
      <p className="week-chart-title">이번 주 감정 흐름</p>
      <div className="week-chart">
        {bars.map((b,i) => (
          <div key={i} className="chart-col">
            <div className="chart-bar-wrap">
              <div className="chart-bar" style={{
                height: b.h ? `${b.h}%` : '4px',
                background: b.emotion ? colors[b.emotion] : 'var(--border)',
                opacity: b.emotion ? 1 : 0.4,
              }} />
            </div>
            <span className="chart-day">{b.day}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        {[['sad','슬픔'],['calm','평온'],['recovery','회복']].map(([k,l]) => (
          <span key={k} className="legend-item">
            <span className="legend-dot" style={{background: colors[k]}} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 녹음 모달 ── */
function RecordModal({ petName, onClose }) {
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [text, setText] = useState('');
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
    } catch { setText('마이크 권한이 필요해요'); }
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
      const res  = await fetch('http://localhost:5000/stt', { method: 'POST', body: form });
      const data = await res.json();
      setText(data.text || '변환 실패');
    } catch { setText('서버 연결 안됨 (Flask 서버 확인)'); }
    setProcessing(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="record-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle2" />
        <p className="record-modal-title">오늘 하루 기록하기</p>
        <p className="record-modal-sub">{petName}에 대한 감정을 자유롭게 말해보세요</p>
        <button className={"rec-mic-btn" + (recording ? " rec-on" : "")}
          onClick={recording ? stopRec : startRec} disabled={processing}>
          {processing
            ? <span className="rec-dots">●●●</span>
            : <span className="rec-icon">🎤</span>}
          {recording && <span className="rec-ring" />}
        </button>
        <p className="rec-hint">{processing ? '분석 중...' : recording ? '탭해서 중지' : '탭해서 녹음'}</p>
        {text && (
          <div className="rec-result">
            <p className="rec-result-label">인식 결과</p>
            <p className="rec-result-text">{text}</p>
            <button className="rec-save-btn" onClick={onClose}>저장하기</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function EmotionDiary({ petName = '우리 아이' }) {
  const now        = new Date();
  const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [showRecord,  setShowRecord]  = useState(false);

  const filteredEntries = SAMPLE_ENTRIES.filter(e => e.date === selectedDay);

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

      {/* 월간 달력 */}
      <MonthCalendar
        entryDates={ENTRY_DATES}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* 선택 날짜 일기 */}
      <p className="diary-day-label">{fmtSelected()} 기록</p>
      <div className="diary-list">
        {filteredEntries.length > 0
          ? filteredEntries.map(e => <DiaryCard key={e.id} entry={e} />)
          : <div className="diary-empty">이 날의 기록이 없어요 🌿</div>}
      </div>

      {/* 주간 흐름 */}
      <WeekChart />

      <div style={{height: 90}} />

      <button className="float-rec-btn" onClick={() => setShowRecord(true)}>🎤</button>
      {showRecord && <RecordModal petName={petName} onClose={() => setShowRecord(false)} />}
    </div>
  );
}