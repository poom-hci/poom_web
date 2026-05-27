import './Home.css';

function PixelRoom() {
  return (
    <div className="room">
      {/* Wall */}
      <div className="wall">
        {/* Window */}
        <div className="window">
          <div className="window-sky">
            <span className="star s1">★</span>
            <span className="star s2">✦</span>
            <span className="star s3">★</span>
            <span className="star s4">✦</span>
            <span className="star s5">★</span>
          </div>
          <div className="window-sill" />
        </div>
        {/* Picture frame */}
        <div className="frame">
          <div className="frame-inner">🐾</div>
        </div>
      </div>

      {/* Floor */}
      <div className="floor">
        <div className="floor-plank" /><div className="floor-plank" />
        <div className="floor-plank" /><div className="floor-plank" />

        {/* Desk */}
        <div className="desk">
          <div className="desk-top">
            <div className="monitor">
              <div className="monitor-screen">♥</div>
            </div>
            <div className="plant">🪴</div>
          </div>
          <div className="desk-legs" />
        </div>

        {/* Sofa */}
        <div className="sofa">
          <div className="sofa-back" />
          <div className="sofa-seat">
            <div className="cushion" />
            <div className="cushion" />
          </div>
          <div className="sofa-arm left" />
          <div className="sofa-arm right" />
        </div>
      </div>
    </div>
  );
}

function PixelDog({ mood = 'calm' }) {
  const tint = mood === 'sad' ? '#7080C0' : mood === 'happy' ? '#E8C840' : '#D4956A';
  return (
    <div className="dog-wrap">
      {/* Speech bubble */}
      <div className="bubble">
        안녕, 보고싶었어 🐾
        <div className="bubble-tail" />
      </div>

      {/* Pixel dog SVG */}
      <svg viewBox="0 0 64 64" className="dog-svg" xmlns="http://www.w3.org/2000/svg">
        {/* Ears */}
        <rect x="10" y="10" width="10" height="14" fill={tint} />
        <rect x="44" y="10" width="10" height="14" fill={tint} />
        <rect x="12" y="12" width="6" height="10" fill="#C87070" opacity="0.5"/>
        <rect x="46" y="12" width="6" height="10" fill="#C87070" opacity="0.5"/>
        {/* Head */}
        <rect x="12" y="16" width="40" height="28" fill={tint} />
        {/* Eyes */}
        <rect x="20" y="24" width="6" height="6" fill="#2C1F14" />
        <rect x="38" y="24" width="6" height="6" fill="#2C1F14" />
        <rect x="21" y="25" width="2" height="2" fill="#fff" />
        <rect x="39" y="25" width="2" height="2" fill="#fff" />
        {/* Nose */}
        <rect x="28" y="33" width="8" height="5" fill="#2C1F14" />
        <rect x="30" y="34" width="2" height="2" fill="#6A4A8A" opacity="0.5"/>
        {/* Mouth */}
        <rect x="26" y="38" width="4" height="2" fill="#2C1F14" />
        <rect x="34" y="38" width="4" height="2" fill="#2C1F14" />
        {/* Body */}
        <rect x="16" y="44" width="32" height="16" fill={tint} />
        {/* Paws */}
        <rect x="12" y="54" width="10" height="8" fill={tint} />
        <rect x="42" y="54" width="10" height="8" fill={tint} />
        <rect x="13" y="59" width="8" height="3" fill="#C87070" opacity="0.4"/>
        <rect x="43" y="59" width="8" height="3" fill="#C87070" opacity="0.4"/>
        {/* Tail */}
        <rect x="48" y="46" width="6" height="4" fill={tint} />
        <rect x="52" y="42" width="6" height="6" fill={tint} />
      </svg>
    </div>
  );
}

export default function Home() {
  const handleTalk = () => {
    console.log('[POOM-V2] 말 걸기 버튼 클릭');
  };

  return (
    <div className="home-wrap">
      <PixelRoom />
      <div className="home-center">
        <PixelDog mood="calm" />
        <button className="px-btn talk-btn" onClick={handleTalk}>
          말 걸기 🎙️
        </button>
      </div>
    </div>
  );
}
