import { useState, useEffect, useRef } from 'react';
import './HomePage.css';
import { saveDiaryEntry, getDiaryEntries, BASE } from '../api';

export const BREEDS = [
  { id: 'golden',    name: '골든 리트리버', emoji: '🐕' },
  { id: 'shiba',     name: '시바이누',      emoji: '🦊' },
  { id: 'bichon',    name: '비숑 프리제',   emoji: '🐩' },
  { id: 'schnauzer', name: '슈나우저',      emoji: '🐶' },
  { id: 'chihuahua', name: '치와와',        emoji: '🐕' },
  { id: 'poodle',    name: '푸들',          emoji: '🐩' },
];

const FALLBACK = '/rooms/placeholder.svg';

const EMOTION_STYLE = {
  Sadness:   { kr: '슬픔',  color: '#E8704A', bg: '#FDF0EB' },
  Anger:     { kr: '분노',  color: '#D63031', bg: '#FFE9E8' },
  Anxiety:   { kr: '불안',  color: '#A29BFE', bg: '#F0EEFF' },
  Neutral:   { kr: '평온',  color: '#4CAF7D', bg: '#EBF7F1' },
  Happiness: { kr: '행복',  color: '#FDCB6E', bg: '#FFF9EC' },
};


/* ── 방 이미지 ── */
function RoomImage({ src }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); setImgSrc(src); }, [src]);
  return (
    <img src={imgSrc} alt="방"
      className={"room-img " + (loaded ? "loaded" : "loading")}
      onLoad={() => setLoaded(true)}
      onError={() => { if (imgSrc !== FALLBACK) setImgSrc(FALLBACK); }} />
  );
}

/* ── 말 걸기 모달 ── */
function TalkModal({ petName, onClose, onEmotionResult, onSaved }) {
  const [mode,       setMode]       = useState('voice');
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result,     setResult]     = useState(null);
  const [textInput,  setTextInput]  = useState('');
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
      const res  = await fetch(`${BASE}/stt`, { method: 'POST', body: form });
      const data = await res.json();
      setResult(data);
      if (data.emotion) onEmotionResult?.(data.emotion);
    } catch {
      setResult({ text: '서버에 연결할 수 없어요 (Flask 서버 확인)' });
    }
    setProcessing(false);
  }

  async function sendText() {
    if (!textInput.trim()) return;
    setProcessing(true);
    try {
      const res  = await fetch(`${BASE}/analyze_text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await res.json();
      setResult(data);
      if (data.emotion) onEmotionResult?.(data.emotion);
    } catch {
      setResult({ text: textInput, emotion: null });
    }
    setProcessing(false);
  }

  const switchMode = m => { setMode(m); setSaved(false); setResult(null); };
  const emo = result?.emotion ? EMOTION_STYLE[result.emotion] : null;

  const handleSave = async () => {
    await saveDiaryEntry({ ...result, type: mode });
    setSaved(true);
    onSaved?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="talk-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <p className="modal-title">{petName}한테 말 걸기</p>
        <p className="modal-sub">오늘 하루 어떠셨나요? 편하게 전해보세요</p>

        <div className="talk-mode-row">
          <button className={"talk-mode-btn" + (mode==='voice' ? ' active' : '')}
            onClick={() => switchMode('voice')}>🎤 음성</button>
          <button className={"talk-mode-btn" + (mode==='text' ? ' active' : '')}
            onClick={() => switchMode('text')}>✏️ 텍스트</button>
        </div>

        {mode === 'voice' ? (
          <>
            <button className={"mic-btn" + (recording ? " recording" : "")}
              onClick={recording ? stopRec : startRec} disabled={processing}>
              {processing
                ? <span className="mic-processing">●●●</span>
                : recording
                  ? <><span className="mic-pulse" /><span className="mic-icon">🎤</span></>
                  : <span className="mic-icon">🎤</span>}
            </button>
            <p className="mic-hint">
              {processing ? '분석 중...' : recording ? '탭해서 중지' : '탭해서 녹음 시작'}
            </p>
          </>
        ) : (
          <div className="text-talk-area">
            <textarea
              className="text-talk-input"
              placeholder={petName + "에게 하고 싶은 말을 적어보세요..."}
              value={textInput}
              onChange={e => { setTextInput(e.target.value); setSaved(false); setResult(null); }}
              rows={4}
            />
            <button className="btn-save-talk"
              onClick={sendText}
              disabled={!textInput.trim() || processing}>
              {processing ? '분석 중...' : '감정 분석하기'}
            </button>
          </div>
        )}

        {result && (
          <div className="talk-result">
            {result.text && mode === 'voice' && (
              <>
                <p className="talk-result-label">📝 인식된 내용</p>
                <p className="talk-result-text">{result.text}</p>
              </>
            )}
            {emo && (
              <div className="emotion-result-box" style={{ background: emo.bg }}>
                <span className="emo-res-label">감정 분석 결과</span>
                <span className="emo-res-tag" style={{ color: emo.color }}>{emo.kr}</span>
                <span className="emo-res-conf">{Math.round((result.confidence || 0) * 100)}%</span>
              </div>
            )}
            {!saved
              ? <button className="btn-save-talk" onClick={handleSave}>
                  📖 감정일기에 저장하기
                </button>
              : <p className="talk-saved">✓ 감정일기에 저장되었어요</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 방 꾸미기 시트 ── */
function RoomSheet({ theme, selectedBreed, onBreedSelect, onThemeChange, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="room-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <p className="modal-title">방 꾸미기</p>
        <p className="modal-sub">배경 테마와 강아지 종을 선택해요</p>
        <p className="sheet-sec">🌿 배경 테마</p>
        <div className="theme-row">
          {[{id:'night',icon:'🌙',label:'밤 모드',sub:'아늑한 달빛 방'},
            {id:'day',  icon:'☀️',label:'낮 모드',sub:'따뜻한 햇살 방'}].map(t => (
            <button key={t.id} className={"theme-opt" + (theme===t.id ? ' active':'')}
              onClick={() => onThemeChange(t.id)}>
              <span className="t-emoji">{t.icon}</span>
              <span className="t-label">{t.label}</span>
              <span className="t-sub">{t.sub}</span>
            </button>
          ))}
        </div>
        <p className="sheet-sec">🐾 강아지 종</p>
        <div className="breed-grid">
          {BREEDS.map(b => (
            <button key={b.id} className={"breed-opt" + (selectedBreed===b.id ? ' active':'')}
              onClick={() => onBreedSelect(b.id)}>
              <span className="b-emoji">{b.emoji}</span>
              <span className="b-name">{b.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function HomePage({ petInfo, theme, onThemeChange, selectedBreed, onBreedChange, onGoRegister, onGoToDiary }) {
  const [showTalk,      setShowTalk]      = useState(false);
  const [showSheet,     setShowSheet]     = useState(false);
  const [bpm]                             = useState(72);
  const [temp,          setTemp]          = useState(38.5);
  const [recentEntries, setRecentEntries] = useState([]);

  useEffect(() => {
    getDiaryEntries()
      .then(all => setRecentEntries(all.slice(0, 3)))
      .catch(() => setRecentEntries([]));
  }, []);

  const getRoomSrc = () => {
    if (selectedBreed) return `/rooms/${theme}_${selectedBreed}.png`;
    return `/rooms/${theme}_empty.png`;
  };

  const petName   = petInfo?.name || '우리 아이';

  const postControl = (action, value) => {
    fetch(`${BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, value }),
    }).catch(() => {});
  };

  const EMO_TAG = {
    Sadness:   { color:'var(--accent)', bg:'var(--accent-bg)', label:'슬픔' },
    Anger:     { color:'#D63031',       bg:'#FFE9E8',          label:'분노' },
    Anxiety:   { color:'#A29BFE',       bg:'#F0EEFF',          label:'불안' },
    Neutral:   { color:'var(--green)',  bg:'var(--green-bg)',   label:'평온' },
    Happiness: { color:'#F39C12',       bg:'#FFF9EC',          label:'행복' },
  };

  return (
    <div className="home-wrap">

      {/* 배경 — 클릭 시 말 걸기 */}
      <div className="room-section" onClick={() => setShowTalk(true)}>
        <RoomImage src={getRoomSrc()} />
        <button className="theme-toggle-btn"
          onClick={e => { e.stopPropagation(); onThemeChange(theme==='night'?'day':'night'); }}>
          {theme==='night' ? '☀️' : '🌙'}
        </button>
        <div className="room-talk-hint">💬 탭해서 말 걸기</div>
        {/* 견종 변경 버튼 (우하단 작게) */}
        <button className="room-breed-btn"
          onClick={e => { e.stopPropagation(); setShowSheet(true); }}>
          {BREEDS.find(b=>b.id===selectedBreed)?.emoji || '🐾'}
        </button>
      </div>

      <div className="home-content">

        {/* 타이틀 */}
        <div className="home-header">
          <h1 className="home-title">{petName}의 품</h1>
        </div>

        {/* 스탯 3칸 */}
        <div className="stats-row">
          <div className="stat-card">
            <p className="stat-label">심장박동</p>
            <div className="stat-val-row">
              <span className="stat-big">{bpm}</span>
              <span className="stat-unit">BPM</span>
            </div>
            <div className="bpm-bars">
              {[0.4,0.7,1.0,0.6,0.8,0.5,0.9].map((h,i) => (
                <div key={i} className="bpm-bar" style={{height:`${h*22}px`}} />
              ))}
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-label">온열 온도</p>
            <div className="stat-val-row">
              <span className="stat-big">{temp.toFixed(1)}</span>
              <span className="stat-unit">°C</span>
            </div>
            <p className="stat-active">🔥 활성</p>
          </div>
        </div>

        {/* 하드웨어 제어 */}
        <div className="hw-control-row">
          <div className="hw-card">
            <p className="hw-label">온열 온도</p>
            <p className="hw-val">{temp}°C</p>
            <div className="hw-btn-row">
              <button className="hw-btn hw-btn-down"
                onClick={() => { setTemp(t => Math.round((t - 10) * 10) / 10); postControl('temp_down'); }}>
                −10°C
              </button>
              <button className="hw-btn hw-btn-up"
                onClick={() => { setTemp(t => Math.round((t + 10) * 10) / 10); postControl('temp_up'); }}>
                +10°C
              </button>
            </div>
          </div>
          <div className="hw-card">
            <p className="hw-label">햅틱 진동</p>
            <p className="hw-val">작동 중</p>
            <button className="hw-btn hw-btn-off"
              onClick={() => postControl('off')}>
              멈춤
            </button>
          </div>
        </div>

        {/* 최근 대화 — 감정일기 탭과 연동 */}
        <div className="recent-header">
          <span className="recent-title">최근 대화 기록</span>
          <button className="recent-more" onClick={onGoToDiary}>전체보기 →</button>
        </div>

        {recentEntries.length > 0 ? recentEntries.map((r, i) => {
          const tag = EMO_TAG[r.emotion] || EMO_TAG.Neutral;
          return (
            <div key={r.id || i} className="recent-item">
              <div className="recent-icon">
                {r.type === 'voice' ? '🎤' : '✏️'}
              </div>
              <div className="recent-body">
                <p className="recent-text">{r.text || '(내용 없음)'}</p>
                <p className="recent-time">{r.date} {r.time}</p>
              </div>
              <span className="recent-tag" style={{color:tag.color, background:tag.bg}}>{tag.label}</span>
            </div>
          );
        }) : (
          <div className="recent-empty">
            배경을 탭해서 첫 대화를 시작해보세요 💬
          </div>
        )}

        <div style={{height:24}}/>
      </div>

      {showTalk && (
        <TalkModal
          petName={petName}
          onClose={() => setShowTalk(false)}
          onSaved={() =>
            getDiaryEntries()
              .then(all => setRecentEntries(all.slice(0, 3)))
              .catch(() => {})
          }
        />
      )}
      {showSheet && (
        <RoomSheet theme={theme} selectedBreed={selectedBreed}
          onBreedSelect={id => { onBreedChange(id); setShowSheet(false); }}
          onThemeChange={t => onThemeChange(t)}
          onClose={() => setShowSheet(false)} />
      )}
    </div>
  );
}