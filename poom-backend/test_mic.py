import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import pyaudio
import wave
import tempfile
from faster_whisper import WhisperModel

DURATION = 5
RATE = 16000
CHUNK = 1024
CHANNELS = 1

# 마이크 목록 출력
pa = pyaudio.PyAudio()
print("=" * 40)
print("인식된 마이크 장치 목록")
print("=" * 40)
for i in range(pa.get_device_count()):
    info = pa.get_device_info_by_index(i)
    if info['maxInputChannels'] > 0:
        print(f"  [{i}] {info['name']}")
print("=" * 40)

# 기본 입력 장치
default = pa.get_default_input_device_info()
print(f"기본 마이크: [{default['index']}] {default['name']}")
print("=" * 40)

# 녹음
print(f"\n{DURATION}초 녹음 시작... 말해보세요!")
stream = pa.open(format=pyaudio.paInt16, channels=CHANNELS,
                 rate=RATE, input=True, frames_per_buffer=CHUNK)

frames = []
for _ in range(int(RATE / CHUNK * DURATION)):
    frames.append(stream.read(CHUNK))

stream.stop_stream()
stream.close()
pa.terminate()
print("녹음 완료!")

# 임시 wav 파일 저장
with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
    tmp_path = tmp.name

with wave.open(tmp_path, 'wb') as wf:
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(2)
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))

# Whisper STT
print("\nWhisper 모델 로딩 중...")
model = WhisperModel("base", device="cpu", compute_type="int8")
print("변환 중...")

segments, _ = model.transcribe(tmp_path, language='ko')
text = ' '.join(s.text for s in segments).strip()
os.unlink(tmp_path)

print("=" * 40)
print(f"STT 결과: {text}")
print("=" * 40)
