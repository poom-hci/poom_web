import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import json
import sqlite3
import tempfile
import numpy as np
import onnxruntime as ort
import librosa
from datetime import datetime
from tokenizers import Tokenizer
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from faster_whisper import WhisperModel
import serial
import time

# 아두이노 블루투스 포트 전역 초기화
try:
    # 현재 확인된 무선 포트 COM6 지정, 타임아웃 1초
    arduino = serial.Serial(port='COM6', baudrate=9600, timeout=1)
    time.sleep(2)  # 포트 개방 후 아두이노 안정화를 위한 대기
    print("=== 아두이노 블루투스(COM6) 하드웨어 연동 성공 ===")
except Exception as e:
    print(f"=== 아두이노 블루투스 연결 실패: {e} ===")
    arduino = None

# 하드웨어의 현재 가동 상태를 기록할 전역 변수
hw_status = {
    "vibration": "off",
    "heat": "off",
    "current_emotion": "Neutral"
}

EMOTION_SIGNAL_MAP = {
    "Neutral":   b'N',  # 평온
    "Anxiety":   b'A',  # 불안
    "Sadness":   b'S',  # 슬픔
    "Anger":     b'R',  # 분노
    "Happiness": b'H'   # 행복
}

app = Flask(__name__)
CORS(app)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DB_PATH   = os.path.join(BASE_DIR, "poom.db")

# ── SQLite ─────────────────────────────────────────────────────────
def get_db():
    db = getattr(g, '_db', None)
    if db is None:
        db = g._db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_db(e=None):
    db = getattr(g, '_db', None)
    if db: db.close()

def init_db():
    with app.app_context():
        db = sqlite3.connect(DB_PATH)
        db.execute('''
            CREATE TABLE IF NOT EXISTS diary_entries (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                date       TEXT    NOT NULL,
                time       TEXT    NOT NULL,
                text       TEXT,
                emotion    TEXT,
                emotion_kr TEXT,
                confidence REAL,
                type       TEXT,
                created_at TEXT    DEFAULT (datetime('now','localtime'))
            )
        ''')
        db.commit()
        db.close()
        print(f"[DB] 초기화 완료 → {DB_PATH}")

init_db()

# ── 감정 모델 ──────────────────────────────────────────────────────
with open(os.path.join(MODEL_DIR, "meta.json"), encoding="utf-8") as f:
    meta = json.load(f)

LABELS       = meta["labels"]
AUDIO_PARAMS = meta["audio_params"]
MAX_LEN      = meta["max_length"]
LABEL_KR     = {"Sadness":"슬픔","Anger":"분노","Anxiety":"불안","Neutral":"평온","Happiness":"행복"}

print("Whisper 모델 로딩 중...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
print("Whisper 준비 완료")

print("감정 모델 로딩 중 (439 MB)...")
emo_session = ort.InferenceSession(
    os.path.join(MODEL_DIR, "fusion_model.onnx"),
    providers=["CPUExecutionProvider"]
)
tok = Tokenizer.from_file(os.path.join(MODEL_DIR, "tokenizer.json"))
tok.enable_padding(pad_id=0, pad_token="[PAD]", length=MAX_LEN)
tok.enable_truncation(max_length=MAX_LEN)
print(f"감정 모델 준비 완료 — {LABELS}")

# ── 헬퍼 ───────────────────────────────────────────────────────────
def softmax(x):
    e = np.exp(x - np.max(x)); return e / e.sum()

def audio_to_mel(path):
    from faster_whisper.audio import decode_audio   # webm/opus 지원 (built-in ffmpeg)
    sr     = AUDIO_PARAMS["sr"]
    target = int(sr * AUDIO_PARAMS["target_duration"])
    y      = decode_audio(path, sampling_rate=sr)   # librosa.load 대체
    y      = np.pad(y,(0,max(0,target-len(y))))[:target]
    mel    = librosa.feature.melspectrogram(y=y,sr=sr,n_mels=AUDIO_PARAMS["n_mels"],
               n_fft=AUDIO_PARAMS["n_fft"],hop_length=AUDIO_PARAMS["hop_length"],
               fmin=AUDIO_PARAMS["fmin"],fmax=AUDIO_PARAMS["fmax"])
    mel_db = librosa.power_to_db(mel, ref=np.max)
    return ((mel_db - mel_db.mean()) / (mel_db.std()+1e-8)).astype(np.float32)

def zeros_mel():
    sr     = AUDIO_PARAMS["sr"]
    target = int(sr * AUDIO_PARAMS["target_duration"])
    mel    = librosa.feature.melspectrogram(y=np.zeros(target,np.float32),sr=sr,
               n_mels=AUDIO_PARAMS["n_mels"],n_fft=AUDIO_PARAMS["n_fft"],
               hop_length=AUDIO_PARAMS["hop_length"],fmin=AUDIO_PARAMS["fmin"],
               fmax=AUDIO_PARAMS["fmax"])
    return librosa.power_to_db(mel, ref=np.max).astype(np.float32)

def tokenize(text):
    enc  = tok.encode(text or ".")
    return (np.array([enc.ids],dtype=np.int64),
            np.array([enc.attention_mask],dtype=np.int64))

def run_emotion(mel_2d, text):
    mel_in     = mel_2d[np.newaxis,np.newaxis,:,:]
    ids, mask  = tokenize(text)
    logits     = emo_session.run(["logits"],
                   {"mel":mel_in,"input_ids":ids,"attention_mask":mask})[0][0]
    probs      = softmax(logits)
    idx        = int(np.argmax(probs))
    label_en   = LABELS[idx]
    return label_en, LABEL_KR.get(label_en, label_en), float(probs[idx])

# ── 엔드포인트 ─────────────────────────────────────────────────────

@app.route('/control', methods=['POST'])
def control_hardware():
    data = request.get_json()
    action = data.get("action")  # 예: "emotion_test" 또는 "vibration"
    value = data.get("value")    # 예: "Anxiety", "Sadness" 또는 "off"

    print(f"하드웨어 제어 요청 수신 - Action: {action}, Value: {value}")

    if not arduino or not arduino.is_open:
        return jsonify({"status": "error", "message": "아두이노 보드가 연결되어 있지 않습니다."}), 500

    if value == "off" or action == "off":
        arduino.write(b'0')  # 전체 정지 신호
        hw_status["vibration"] = "off"
        hw_status["heat"] = "off"
        hw_status["current_emotion"] = "Neutral"
    else:
        # 가해진 value 값이 감정 맵에 존재하는지 확인
        if value in EMOTION_SIGNAL_MAP:
            signal = EMOTION_SIGNAL_MAP[value]
            arduino.write(signal)  # 해당 감정 고유 문자 전송 (N, A, S, R, H)
            hw_status["vibration"] = "on"
            hw_status["heat"] = "on"
            hw_status["current_emotion"] = value

    return jsonify({"status": "success", "current_status": hw_status}), 200

# ── STT + 감정 분석 ────────────────────────────────────────────────
@app.route('/stt', methods=['POST'])
def stt():
    if 'audio' not in request.files:
        return jsonify({'error':'음성 파일 없음'}), 400
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
        request.files['audio'].save(tmp.name); tmp_path = tmp.name
    try:
        segments, _ = whisper_model.transcribe(tmp_path, language='ko')
        text = ' '.join(s.text for s in segments).strip()
        print(f"[STT] {text}")
        try:
            mel = audio_to_mel(tmp_path)
            label_en, label_kr, conf = run_emotion(mel, text)
            print(f"[감정] {label_kr} ({conf:.2%})")

            # [AI 하드웨어 다이나믹 연동 연산부 추가]
            if arduino and arduino.is_open:
                if label_en in EMOTION_SIGNAL_MAP:
                    signal = EMOTION_SIGNAL_MAP[label_en]
                    arduino.write(signal)  # 예측된 감정 신호(N, A, S, R, H) 자동 전송
                    
                    hw_status["vibration"] = "on" if label_en != "Neutral" else "off"
                    hw_status["heat"] = "on"
                    hw_status["current_emotion"] = label_en
                    print(f"=> [AI 자동제어] 음성 감정 {label_en} 감지 -> 아두이노 신호 {signal} 전송 완료")

        except Exception as e:
            print(f"[감정 오류] {e}"); label_en,label_kr,conf = "Neutral","평온",0.0
    finally:
        os.unlink(tmp_path)
    return jsonify({'text':text,'emotion':label_en,'emotion_kr':label_kr,'confidence':round(conf,3)})

@app.route('/analyze_text', methods=['POST'])
def analyze_text():
    text = (request.json or {}).get('text','').strip()
    if not text: return jsonify({'error':'텍스트 없음'}), 400
    try:
        label_en, label_kr, conf = run_emotion(zeros_mel(), text)
        print(f"[텍스트 감정] {label_kr} ({conf:.2%})")

        # [AI 하드웨어 다이나믹 연동 연산부 추가]
        if arduino and arduino.is_open:
            if label_en in EMOTION_SIGNAL_MAP:
                signal = EMOTION_SIGNAL_MAP[label_en]
                arduino.write(signal)  # 예측된 감정 신호(N, A, S, R, H) 자동 전송
                
                hw_status["vibration"] = "on" if label_en != "Neutral" else "off"
                hw_status["heat"] = "on"
                hw_status["current_emotion"] = label_en
                print(f"=> [AI 자동제어] 텍스트 감정 {label_en} 감지 -> 아두이노 신호 {signal} 전송 완료")

    except Exception as e:
        print(f"[감정 오류] {e}"); label_en,label_kr,conf = "Neutral","평온",0.0
    return jsonify({'text':text,'emotion':label_en,'emotion_kr':label_kr,'confidence':round(conf,3)})

# ── 일기 저장 / 조회 ────────────────────────────────────────────────
@app.route('/diary', methods=['POST'])
def save_diary():
    d = request.json or {}
    now = datetime.now()
    date = d.get('date') or now.strftime('%Y-%m-%d')
    time = d.get('time') or now.strftime('%p %I:%M').replace('AM','오전').replace('PM','오후')
    db = get_db()
    db.execute(
        'INSERT INTO diary_entries (date,time,text,emotion,emotion_kr,confidence,type) VALUES (?,?,?,?,?,?,?)',
        (date, time, d.get('text',''), d.get('emotion','Neutral'),
         d.get('emotion_kr','평온'), d.get('confidence',0), d.get('type','text'))
    )
    db.commit()
    print(f"[DB] 저장 → {date} {time} / {d.get('emotion_kr')}")
    return jsonify({'status':'ok'})

@app.route('/diary', methods=['GET'])
def get_diary():
    date = request.args.get('date')   # ?date=2026-05-27 (없으면 전체)
    db   = get_db()
    if date:
        rows = db.execute(
            'SELECT * FROM diary_entries WHERE date=? ORDER BY created_at DESC', (date,)
        ).fetchall()
    else:
        rows = db.execute(
            'SELECT * FROM diary_entries ORDER BY created_at DESC'
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/diary/dates', methods=['GET'])
def get_diary_dates():
    """기록이 있는 날짜 목록 반환 (달력 점 표시용)"""
    db   = get_db()
    rows = db.execute('SELECT DISTINCT date FROM diary_entries').fetchall()
    return jsonify([r['date'] for r in rows])

@app.route('/status', methods=['GET'])
def status():
    # 고정된 값이 아니라, 현재 AI 로직이나 웹 제어로 바뀐 실시간 상태를 반환합니다.
    return jsonify(hw_status), 200

if __name__ == '__main__':
    # debug=True 시 블루투스 포트가 중복 개방되어 에러가 날 수 있으므로 False로 설정합니다.
    app.run(host='0.0.0.0', debug=False, port=5000)