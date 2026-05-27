import { useState, useEffect, useRef } from 'react';
import './HomePage.css';

export const BREEDS = [
  { id: 'golden',    name: '골든 리트리버', emoji: '🐕' },
  { id: 'shiba',     name: '시바이누',      emoji: '🦊' },
  { id: 'bichon',    name: '비숑 프리제',   emoji: '🐩' },
  { id: 'schnauzer', name: '슈나우저',      emoji: '🐶' },
  { id: 'chihuahua', name: '치와와',        emoji: '🐕' },
  { id: 'poodle',    name: '푸들',          emoji: '🐩' },
];

const FALLBACK = '/rooms/placeholder.svg';

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

/* ── 말 걸기 모달 (음성 + 텍스트) ── */
function TalkModal({ petName, onClose }) {
  const [mode,       setMode]       = useState('voice');
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceText,  setVoiceText]  = useState('');
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
    } catch { setVoiceText('마이크 권한이 필요해요'); }
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
      setVoiceText(data.text || '변환 실패');
    } catch { setVoiceText('서버에 연결할 수 없어요 (Flask 서버 확인)'); }
    setProcessing(false);
  }

  const switchMode = m => { setMode(m); setSaved(false); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="talk-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <p className="modal-title">{petName}한테 말 걸기</p>
        <p className="modal-sub">오늘 하루 어떠셨나요? 편하게 전해보세요</p>

        {/* 모드 토글 */}
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
              {processing ? '변환 중...' : recording ? '탭해서 중지' : '탭해서 녹음 시작'}
            </p>
            {voiceText && (
              <div className="talk-result">
                <p className="talk-result-label">📝 인식된 내용</p>
                <p className="talk-result-text">{voiceText}</p>
                {!saved
                  ? <button className="btn-save-talk" onClick={() => setSaved(true)}>저장하기</button>
                  : <p className="talk-saved">✓ 저장되었어요</p>}
              </div>
            )}
          </>
        ) : (
          <div className="text-talk-area">
            <textarea
              className="text-talk-input"
              placeholder={petName + "에게 하고 싶은 말을 적어보세요..."}
              value={textInput}
              onChange={e => { setTextInput(e.target.value); setSaved(false); }}
              rows={5}
            />
            {!saved
              ? <button className="btn-save-talk"
                  onClick={() => { if (textInput.trim()) setSaved(true); }}
                  disabled={!textInput.trim()}>저장하기</button>
              : <p className="talk-saved">✓ 저장되었어요</p>}
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
        <button className="breed-none-btn" onClick={() => onBreedSelect(null)}>빈 방으로 보기</button>
      </div>
    </div>
  );
}

/* ── 메인 홈페이지 ── */
export default function HomePage({ petInfo, theme, onThemeChange, selectedBreed, onBreedChange, onGoRegister }) {
  const [showTalk,  setShowTalk]  = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [bpm,  setBpm]  = useState(72);
  const [temp, setTemp] = useState(36);

  const getRoomSrc = () => {
    if (theme === 'day') return '/rooms/day_empty.png';
    if (selectedBreed)   return `/rooms/night_${selectedBreed}.png`;
    return '/rooms/night_empty.png';
  };

  const petName   = petInfo?.name || '우리 아이';
  const breedName = BREEDS.find(b => b.id === selectedBreed)?.name || '강아지 선택';
  const petAge    = petInfo?.birthDate
    ? Math.floor((Date.now() - new Date(petInfo.birthDate)) / (1000*60*60*24*365)) + '살'
    : '';

  const postControl = (action, value) => {
    fetch('http://localhost:5000/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, value }),
    }).catch(() => {});
  };

  const RECENT = [
    { icon:'🌙', text:'오늘 많이 보고 싶었어...', time:'오늘 오후 11:20', tag:'슬픔', tagColor:'var(--accent)', tagBg:'var(--accent-bg)' },
    { icon:'☀️', text:'공원에 다녀왔어. 네가 좋아하던 곳', time:'어제 오후 3:15', tag:'평온', tagColor:'var(--green)', tagBg:'var(--green-bg)' },
    { icon:'🌸', text:'사진 보다 웃었어 ㅎㅎ', time:'3일 전', tag:'회복', tagColor:'var(--blue)', tagBg:'var(--blue-bg)' },
  ];

  return (
    <div className="home-wrap">

      {/* ── 배경 클릭 → 말 걸기 ── */}
      <div className="room-section" onClick={() => setShowTalk(true)}>
        <RoomImage src={getRoomSrc()} />
        <button className="theme-toggle-btn"
          onClick={e => { e.stopPropagation(); onThemeChange(theme==='night'?'day':'night'); }}>
          {theme==='night' ? '☀️' : '🌙'}
        </button>
        <div className="room-talk-hint">💬 탭해서 말 걸기</div>
        <div className="room-bottom-bar" onClick={e => e.stopPropagation()}>
          <button className="room-chip" onClick={() => setShowSheet(true)}>
            <span>{BREEDS.find(b=>b.id===selectedBreed)?.emoji || '🐾'}</span>
            <span>{breedName}</span>
            <span className="chip-arrow">▾</span>
          </button>
          <span className="room-theme-lbl">{theme==='night'?'🌙 달빛':'☀️ 햇살'}</span>
        </div>
      </div>

      {/* ── 스크롤 콘텐츠 ── */}
      <div className="home-content">

        {/* 인사 헤더 */}
        <div className="home-header">
          <h1 className="home-greeting">안녕하세요 👋</h1>
          <p className="home-sub">오늘도 {petName}가 기다리고 있어요</p>
          {petInfo ? (
            <div className="pet-pill">
              <div className="pet-pill-avatar">
                {petInfo.photo
                  ? <img src={petInfo.photo} alt={petName} className="pet-pill-img"/>
                  : <span>🐾</span>}
              </div>
              <div className="pet-pill-info">
                <span className="pet-pill-name">{petName}</span>
                <span className="pet-pill-sub">{petInfo.type || '반려동물'}{petAge ? ` · ${petAge}` : ''}</span>
              </div>
              <span className="pet-pill-arrow">›</span>
            </div>
          ) : (
            <button className="pet-pill" onClick={onGoRegister} style={{cursor:'pointer'}}>
              <div className="pet-pill-avatar"><span>🐾</span></div>
              <div className="pet-pill-info">
                <span className="pet-pill-name">반려동물 등록하기</span>
                <span className="pet-pill-sub">탭해서 정보를 등록해요</span>
              </div>
              <span className="pet-pill-arrow">›</span>
            </button>
          )}
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
              <span className="stat-big">{temp}</span>
              <span className="stat-unit">°C</span>
            </div>
            <p className="stat-active">🔥 활성</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">감정 상태</p>
            <p className="stat-emotion">슬픔</p>
            <div className="emotion-bar-bg">
              <div className="emotion-bar-fill" style={{width:'45%'}} />
            </div>
          </div>
        </div>

        {/* 온도 슬라이더 */}
        <div className="temp-control">
          <div className="temp-control-header">
            <span className="temp-control-label">온도 조절</span>
            <span className="temp-control-val">{temp}°C</span>
          </div>
          <input type="range" className="temp-slider"
            min={30} max={42} step={0.5} value={temp}
            onChange={e => { setTemp(Number(e.target.value)); postControl('heat', Number(e.target.value)); }}
            style={{'--pct': `${((temp-30)/12)*100}%`}}
          />
          <div className="temp-marks">
            <span>30°C</span><span>체온</span><span>42°C</span>
          </div>
        </div>

        {/* 최근 대화 */}
        <div className="recent-header">
          <span className="recent-title">최근 대화 기록</span>
          <button className="recent-more">전체보기</button>
        </div>
        {RECENT.map((r,i) => (
          <div key={i} className="recent-item">
            <div className="recent-icon">{r.icon}</div>
            <div className="recent-body">
              <p className="recent-text">{r.text}</p>
              <p className="recent-time">{r.time}</p>
            </div>
            <span className="recent-tag" style={{color:r.tagColor, background:r.tagBg}}>{r.tag}</span>
          </div>
        ))}

        <div style={{height:24}}/>
      </div>

      {showTalk  && <TalkModal petName={petName} onClose={() => setShowTalk(false)} />}
      {showSheet && (
        <RoomSheet theme={theme} selectedBreed={selectedBreed}
          onBreedSelect={id => { onBreedChange(id); setShowSheet(false); }}
          onThemeChange={t => onThemeChange(t)}
          onClose={() => setShowSheet(false)} />
      )}
    </div>
  );
}