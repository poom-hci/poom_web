import './Diary.css';

const ENTRIES = [
  { id: 9, date: '2025.04.20', emotion: '😊', stage: '수용', text: '이제는 추억을 떠올리며 미소 지을 수 있을 것 같아요.' },
  { id: 8, date: '2025.04.10', emotion: '🙂', stage: '수용', text: '오늘은 괜찮았어요. 하늘 어딘가에서 잘 지내고 있을 것 같아요.' },
  { id: 7, date: '2025.04.01', emotion: '🙂', stage: '수용', text: '사진을 꺼내 봤어요. 행복한 기억이 더 많다는 걸 느꼈어요.' },
  { id: 6, date: '2025.03.25', emotion: '😔', stage: '우울', text: '슬프지만 조금씩 일상을 되찾는 것 같기도 해요.' },
  { id: 5, date: '2025.03.20', emotion: '😢', stage: '우울', text: '그냥 너무 보고 싶어서 오브제를 안고 한참 울었어요.' },
  { id: 4, date: '2025.03.15', emotion: '😔', stage: '타협', text: '만약 내가 더 잘 돌봤다면 어땠을까 생각했어요.' },
  { id: 3, date: '2025.03.10', emotion: '😢', stage: '분노', text: '오늘도 화가 났어요. 아무도 이 마음을 모를 것 같아요.' },
  { id: 2, date: '2025.03.05', emotion: '😢', stage: '분노', text: '왜 더 빨리 병원에 데려가지 못했을까. 자책이 멈추질 않아요.' },
  { id: 1, date: '2025.03.01', emotion: '😐', stage: '부정', text: '아직도 믿기지 않아요. 집에 오면 기다릴 것 같아서...' },
];

export default function Diary() {
  return (
    <div className="diary-wrap">
      <div className="diary-cover">
        <div className="diary-header">
          <p className="diary-title">POOM DIARY</p>
          <p className="diary-sub">♥ 감정 회복 일지 ♥</p>
        </div>
      </div>

      <div className="diary-body">
        <div className="notebook-lines">
          {ENTRIES.map(e => (
            <div key={e.id} className="entry">
              <div className="entry-left">
                <span className="entry-emotion">{e.emotion}</span>
                <div className="entry-line" />
              </div>
              <div className="entry-right">
                <div className="entry-meta">
                  <span className="entry-date">{e.date}</span>
                  <span className="entry-stage">[{e.stage}]</span>
                </div>
                <p className="entry-text">{e.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
