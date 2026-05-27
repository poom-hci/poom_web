import { useState } from 'react';
import './ObjectControl.css';

function HeartbeatECG() {
  return (
    <div className="ecg-wrap">
      <svg viewBox="0 0 340 72" className="ecg-svg" xmlns="http://www.w3.org/2000/svg">
        <path className="ecg-line" d="
          M 0,36
          L 22,36
          L 27,29 L 33,20 L 39,29 L 44,36
          L 52,36
          L 56,47 L 65,4 L 70,60 L 76,36
          L 83,28 L 88,36
          L 118,36
        " />
        <text x="170" y="46" className="ecg-paw" textAnchor="middle">🐾</text>
        <path className="ecg-line ecg-line-right" d="
          M 222,36
          L 252,36
          L 256,28 L 262,20 L 268,28 L 272,36
          L 280,36
          L 284,47 L 293,4 L 298,60 L 304,36
          L 311,28 L 316,36
          L 340,36
        " />
      </svg>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button className={`toggle ${on ? 'on' : 'off'}`} onClick={onToggle}>
      <span className="toggle-knob" />
    </button>
  );
}

function Slider({ value, min, max, step, onChange, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" className="cslider"
      style={{ '--pct': `${pct}%`, '--acc': color || 'var(--accent)' }}
      min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} />
  );
}

function ControlCard({ icon, title, sub, on, onToggle, children }) {
  return (
    <div className="card oc-card">
      <div className="oc-head">
        <div className="oc-title-row">
          <span className="oc-icon">{icon}</span>
          <div>
            <p className="oc-title">{title}</p>
            <p className="oc-sub">{sub}</p>
          </div>
        </div>
        <Toggle on={on} onToggle={onToggle} />
      </div>
      <div className={`oc-body ${!on ? 'dim' : ''}`}>
        {children}
      </div>
    </div>
  );
}

const API = 'http://localhost:5000/control';

function postControl(action, value) {
  fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, value }),
  }).catch(err => console.error('[POOM] API 오류:', err));
}

export default function ObjectControl() {
  const [vibOn,  setVibOn]  = useState(true);
  const [bpm,    setBpm]    = useState(72);
  const [heatOn, setHeatOn] = useState(true);
  const [temp,   setTemp]   = useState(37);

  const log = (msg, val) => console.log(`[POOM] ${msg}`, val ?? '');

  return (
    <div className="page-wrap" style={{ paddingTop: 60 }}>
      <div className="page-head">
        <h2 className="page-title">오브제 제어</h2>
        <p className="page-sub">품 오브제를 나에게 맞게 설정해요</p>
      </div>

      {/* Heartbeat ECG animation */}
      <HeartbeatECG />

      {/* Status summary */}
      <div className="card status-summary">
        <div className="status-chips">
          <div className={`sch ${vibOn ? 'on' : ''}`}>💓 진동 {vibOn ? `${bpm} BPM` : 'OFF'}</div>
          <div className={`sch ${heatOn ? 'on' : ''}`}>🌡️ {heatOn ? `${temp}°C` : '온열 OFF'}</div>
        </div>
        <div className="status-actions">
          <button className="sa-btn off" onClick={() => { setVibOn(false); setHeatOn(false); log('전체 OFF'); }}>전체 끄기</button>
          <button className="sa-btn on"  onClick={() => { setVibOn(true);  setHeatOn(true);  log('전체 ON'); }}>전체 켜기</button>
        </div>
      </div>

      {/* Vibration — BPM */}
      <ControlCard icon="💓" title="심장박동 진동" sub="반려동물의 체온처럼"
        on={vibOn} onToggle={() => { setVibOn(v => !v); log('진동', !vibOn ? 'ON' : 'OFF'); }}>
        <div className="bpm-display">
          <span className="bpm-num">{bpm}</span>
          <span className="bpm-unit">BPM</span>
        </div>
        <Slider value={bpm} min={40} max={120} step={1}
          onChange={v => { setBpm(v); log('BPM:', v); postControl('vibration', v); }} />
        <div className="bpm-range-labels">
          <span>40 BPM</span>
          <span>느리게</span>
          <span>빠르게</span>
          <span>120 BPM</span>
        </div>
      </ControlCard>

      {/* Heat */}
      <ControlCard icon="🌡️" title="온열 기능" sub="따뜻한 온기"
        on={heatOn} onToggle={() => { setHeatOn(v => !v); log('온열', !heatOn ? 'ON' : 'OFF'); }}>
        <div className="temp-big">{temp}<span className="temp-unit">°C</span></div>
        <Slider value={temp} min={30} max={42} step={0.5} color="#C060A0"
          onChange={v => { setTemp(v); log('온도:', v); postControl('heat', v); }} />
        <div className="temp-presets">
          {[35, 37, 38.5, 40].map(t => (
            <button key={t}
              className={`t-pre ${temp === t ? 'active' : ''}`}
              onClick={() => { setTemp(t); log('온도 프리셋:', t); postControl('heat', t); }}
              disabled={!heatOn}>{t}°</button>
          ))}
        </div>
        <p className="heat-note">🐾 반려동물 평균 체온: 37.5–39.2°C</p>
      </ControlCard>

      <div className="arduino-note">
        🔌 아두이노 연결 후 실제 제어가 활성화됩니다
      </div>
    </div>
  );
}
