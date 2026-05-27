import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile

app = Flask(__name__)
CORS(app)

print("Whisper 모델 로딩 중...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
print("Whisper 모델 준비 완료")

@app.route('/control', methods=['POST'])
def control():
    data = request.json
    action = data.get('action')
    value = data.get('value')
    
    print(f"받은 명령: {action} = {value}")
    # 나중에 여기에 아두이노 시리얼 통신 코드 추가할 거예요
    
    return jsonify({'status': 'ok', 'action': action, 'value': value})

@app.route('/stt', methods=['POST'])
def stt():
    if 'audio' not in request.files:
        return jsonify({'error': '음성 파일 없음'}), 400

    audio_file = request.files['audio']

    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        segments, _ = whisper_model.transcribe(tmp_path, language='ko')
        text = ' '.join(s.text for s in segments).strip()
        print(f"STT 결과: {text}")
    finally:
        os.unlink(tmp_path)

    return jsonify({'text': text})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'vibration': 'off', 'heat': 'off'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)