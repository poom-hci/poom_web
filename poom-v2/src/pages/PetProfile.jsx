import { useState, useRef } from 'react';
import './PetProfile.css';

function InfoRow({ label, value, valueStyle }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value" style={valueStyle}>{value}</span>
    </div>
  );
}

function InfoCard({ title, rows }) {
  return (
    <div className="pp-card">
      <p className="pp-card-title">{title}</p>
      {rows.map((r, i) => <InfoRow key={i} label={r.label} value={r.value} valueStyle={r.style} />)}
    </div>
  );
}

function calcAge(birthDate, passedDate) {
  if (!birthDate) return null;
  const end = passedDate ? new Date(passedDate) : new Date();
  const ms  = end - new Date(birthDate);
  const y   = Math.floor(ms / (1000*60*60*24*365));
  const m   = Math.floor((ms % (1000*60*60*24*365)) / (1000*60*60*24*30));
  if (y > 0 && m > 0) return `${y}년 ${m}개월`;
  if (y > 0) return `${y}년`;
  return `${m}개월`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}

export default function PetProfile({ petInfo, onEdit }) {
  /* 추억 사진 */
  const [photos, setPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('poom_photos') || '[]'); }
    catch { return []; }
  });
  const fileRef = useRef(null);

  const handleAddPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const next = [...photos, ev.target.result];
      setPhotos(next);
      localStorage.setItem('poom_photos', JSON.stringify(next));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx) => {
    if (!window.confirm('이 사진을 삭제할까요?')) return;
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    localStorage.setItem('poom_photos', JSON.stringify(next));
  };

  /* 추억 메모 */
  const [memo, setMemo] = useState(() => {
    try { return localStorage.getItem('poom_memo') || ''; }
    catch { return ''; }
  });

  const handleMemoChange = (e) => {
    const val = e.target.value;
    setMemo(val);
    localStorage.setItem('poom_memo', val);
  };

  const together = calcAge(petInfo.birthDate, petInfo.passedDate);

  const basicRows = [
    { label: '이름',     value: petInfo.name  || '-' },
    { label: '품종',     value: petInfo.type  || '-' },
    { label: '생년월일', value: formatDate(petInfo.birthDate) },
  ];

  const memoryRows = [
    { label: '함께한 시간',   value: together || '-' },
    { label: '총 대화 횟수',  value: (() => {
        try { return JSON.parse(localStorage.getItem('poom_diary_entries')||'[]').length + '회'; }
        catch { return '0회'; }
      })() },
    { label: '감정 회복 단계', value: '진행 중 🌱', style: { color: '#4CAF7D', fontWeight: '700' } },
  ];

  return (
    <div className="pp-wrap">

      {/* 헤더 — 날짜 없이 이름만 */}
      <div className="pp-header">
        <div className="pp-avatar">
          {petInfo.photo
            ? <img src={petInfo.photo} alt={petInfo.name} className="pp-avatar-img" />
            : <span className="pp-avatar-emoji">🐾</span>}
        </div>
        <h2 className="pp-name">{petInfo.name}</h2>
        <button className="pp-edit-btn" onClick={onEdit}>정보 수정</button>
      </div>

      <InfoCard title="기본 정보"   rows={basicRows}  />
      <InfoCard title="함께한 기억" rows={memoryRows} />

      {/* 추억 사진 */}
      <div className="pp-card">
        <p className="pp-card-title">추억 사진</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAddPhoto} hidden />
        <div className="photo-grid">
          {photos.map((src, i) => (
            <div key={i} className="photo-cell photo-real" onClick={() => handleRemovePhoto(i)}>
              <img src={src} alt="" className="photo-real-img" />
              <div className="photo-del-overlay">✕</div>
            </div>
          ))}
          <div className="photo-cell photo-add" onClick={() => fileRef.current?.click()}>
            <span className="photo-add-icon">+</span>
            <span className="photo-add-label">사진 추가</span>
          </div>
        </div>
        {photos.length === 0 && (
          <p className="photo-empty-hint">갤러리에서 추억 사진을 추가해보세요 📸</p>
        )}
      </div>

      {/* 추억 메모 — 자유롭게 기억 남기기 */}
      <div className="pp-card">
        <p className="pp-card-title">추억 메모</p>
        <p className="memo-sub">좋아했던 것, 함께한 기억을 자유롭게 적어보세요</p>
        <textarea
          className="memo-textarea"
          placeholder={"예) 산책을 너무 좋아했어. 공 가져오는 걸 잘했고, 아침마다 발을 핥아줬어..."}
          value={memo}
          onChange={handleMemoChange}
          rows={6}
        />
      </div>

      <div style={{height: 24}} />
    </div>
  );
}