import { useState, useRef } from 'react';
import { BREEDS } from './HomePage';
import './PetRegistration.css';

export default function PetRegistration({ petInfo, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:       petInfo?.name       || '',
    breedId:    petInfo?.breedId    || '',
    birthDate:  petInfo?.birthDate  || '',
    passedDate: petInfo?.passedDate || '',
  });
  const [photo,  setPhoto]  = useState(petInfo?.photo || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setPhoto(ev.target.result);
    r.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    const breedObj = BREEDS.find(b => b.id === form.breedId);
    const type = breedObj ? breedObj.name : (form.breedId || '강아지');
    setTimeout(() => {
      onSave({ ...form, type, photo });
      setSaving(false);
    }, 400);
  };

  return (
    <div className="page-wrap" style={{ paddingTop: 60 }}>
      <div className="page-head">
        <h2 className="page-title">반려동물 정보</h2>
        <p className="page-sub">{petInfo ? '정보를 수정할 수 있어요' : '소중한 반려동물의 정보를 등록해 주세요'}</p>
      </div>

      <form onSubmit={handleSave}>

        {/* 사진 */}
        <div className="photo-upload card">
          <div className="photo-area" onClick={() => fileRef.current?.click()}>
            {photo
              ? <img src={photo} alt="pet" className="photo-img" />
              : <div className="photo-ph">
                  <span className="photo-ph-icon">📷</span>
                  <span className="photo-ph-text">사진 추가</span>
                </div>}
            <div className="photo-badge">{photo ? '변경' : '+'}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
          {photo && (
            <button type="button" className="photo-remove" onClick={() => setPhoto(null)}>
              사진 삭제
            </button>
          )}
        </div>

        {/* 기본 정보 */}
        <div className="card">
          <p className="card-label">기본 정보</p>
          <div className="field">
            <label>이름 *</label>
            <input placeholder="반려동물의 이름" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
        </div>

        {/* 견종 선택 */}
        <div className="card">
          <p className="card-label">🐾 견종 선택</p>
          <p className="breed-hint">선택한 종이 홈 화면 방에 표시돼요</p>
          <div className="breed-select-grid">
            {BREEDS.map(b => (
              <button key={b.id} type="button"
                className={"breed-select-item" + (form.breedId === b.id ? ' active' : '')}
                onClick={() => set('breedId', b.id)}>
                <span className="bsi-emoji">{b.emoji}</span>
                <span className="bsi-name">{b.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 */}
        <div className="card">
          <p className="card-label">날짜</p>
          <div className="row2">
            <div className="field">
              <label>생년월일</label>
              <input type="date" value={form.birthDate}
                onChange={e => set('birthDate', e.target.value)} />
            </div>
            <div className="field">
              <label>무지개다리</label>
              <input type="date" value={form.passedDate}
                onChange={e => set('passedDate', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="reg-actions">
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>취소</button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}
            style={{ flex: onCancel ? 1 : undefined }}>
            {saving ? '저장 중...' : (petInfo ? '수정 저장하기' : '등록하기')}
          </button>
        </div>

      </form>
    </div>
  );
}