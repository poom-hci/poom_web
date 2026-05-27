import { useState } from 'react';
import HomePage     from './pages/HomePage';
import EmotionDiary from './pages/EmotionDiary';
import PetProfile   from './pages/PetProfile';
import PetRegistration from './pages/PetRegistration';
import './App.css';

const TABS = [
  { id: 'home',    icon: '🏠', label: '홈' },
  { id: 'diary',   icon: '📖', label: '감정일기' },
  { id: 'profile', icon: '🐾', label: '펫정보' },
];

function load(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const [tab,           setTab]           = useState('home');
  const [petInfo,       setPetInfo]       = useState(() => load('poom_pet'));
  const [theme,         setTheme]         = useState(() => load('poom_theme', 'night'));
  const [selectedBreed, setSelectedBreed] = useState(() => load('poom_breed', null));
  const [isEditing,     setIsEditing]     = useState(false);

  const handlePetSave = (info) => {
    setPetInfo(info);
    localStorage.setItem('poom_pet', JSON.stringify(info));
    if (info.breedId) {
      setSelectedBreed(info.breedId);
      localStorage.setItem('poom_breed', JSON.stringify(info.breedId));
    }
    setIsEditing(false);
    setTab('profile');
  };

  const changeTheme = (t) => { setTheme(t); localStorage.setItem('poom_theme', JSON.stringify(t)); };
  const changeBreed = (b) => { setSelectedBreed(b); localStorage.setItem('poom_breed', JSON.stringify(b)); };

  const renderContent = () => {
    if (tab === 'home') return (
      <HomePage
        petInfo={petInfo}
        theme={theme} onThemeChange={changeTheme}
        selectedBreed={selectedBreed} onBreedChange={changeBreed}
        onGoRegister={() => { setIsEditing(true); setTab('profile'); }}
      />
    );
    if (tab === 'diary') return <EmotionDiary petName={petInfo?.name || '우리 아이'} />;
    if (tab === 'profile') {
      if (isEditing || !petInfo) return (
        <PetRegistration
          petInfo={petInfo}
          onSave={handlePetSave}
          onCancel={petInfo ? () => setIsEditing(false) : null}
        />
      );
      return <PetProfile petInfo={petInfo} onEdit={() => setIsEditing(true)} />;
    }
    return null;
  };

  return (
    <div className="phone-wrap">
      <div className="mobile-app">
        <div className="status-bar">
          <span className="status-time">9:41</span>
          <span className="status-brand">품 POOM</span>
        </div>
        <div className="content-area">{renderContent()}</div>
        <nav className="bottom-nav">
          {TABS.map(t => (
            <button key={t.id} className={"nav-tab" + (tab === t.id ? ' active' : '')}
              onClick={() => { setTab(t.id); if (t.id !== 'profile') setIsEditing(false); }}>
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}