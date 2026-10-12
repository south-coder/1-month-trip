#!/usr/bin/env python3
"""Synthesize the original score and synchronized effects for the cinematic reel.

All musical notes, ambience, foley, and transition sounds are newly synthesized.
App click tones reproduce src/features/sound/waveform.ts at recorded onsets.
No song, recording, sample library, external service, or network is used.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import wave

import numpy as np


RATE = 48_000
DURATION = 40.0
FRAMES = round(RATE * DURATION)
SEED = 2026101202
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
CHORDS = (
    ("Dmaj9", (62, 66, 69, 73, 76), 38),
    ("Bm11", (59, 62, 66, 69, 76), 35),
    ("Gmaj9", (55, 59, 62, 66, 69), 31),
    ("A6sus2", (57, 59, 64, 66, 69), 33),
)
# An original sparse phrase. Beat offsets are varied across repeated harmony.
MOTIFS = (
    ((0.5, 78), (1.75, 81), (3.0, 76)),
    ((0.25, 74), (1.5, 78), (2.75, 76)),
    ((0.0, 74), (1.25, 71), (2.5, 78), (3.5, 76)),
    ((0.75, 73), (2.0, 76), (3.25, 69)),
    ((0.5, 78), (1.5, 81), (2.75, 85)),
    ((0.25, 81), (1.5, 78), (3.0, 74)),
    ((0.5, 79), (1.75, 78), (3.0, 74)),
    ((0.75, 76), (2.0, 73), (3.25, 71)),
)


def times(seconds: float) -> np.ndarray:
    return np.arange(max(1, round(seconds * RATE)), dtype=np.float64) / RATE


def frequency(midi: int) -> float:
    return 440 * 2 ** ((midi - 69) / 12)


def gate(t: np.ndarray, attack: float, release: float) -> np.ndarray:
    age = t[-1] - t
    return np.sin(np.clip(t / attack, 0, 1) * math.pi / 2) ** 2 * np.sin(
        np.clip(age / release, 0, 1) * math.pi / 2
    ) ** 2


def add(mix: np.ndarray, voice: np.ndarray, start: float, gain: float, pan: float = 0) -> None:
    begin = round(start * RATE)
    if begin < 0 or begin >= FRAMES:
        return
    count = min(len(voice), FRAMES - begin)
    angle = (np.clip(pan, -1, 1) + 1) * math.pi / 4
    mix[begin : begin + count, 0] += voice[:count] * gain * math.cos(angle)
    mix[begin : begin + count, 1] += voice[:count] * gain * math.sin(angle)


def bell(midi: int, duration: float = 1.6) -> np.ndarray:
    t = times(duration)
    f = frequency(midi)
    phase = 2 * math.pi * f * t
    # Rounded electric-piano fundamental with warm, fast-decaying mallet partials.
    result = np.sin(phase + 0.24 * np.sin(2 * phase) * np.exp(-5 * t)) * np.exp(-3.0 * t)
    result += 0.11 * np.sin(3.002 * phase) * np.exp(-8.0 * t)
    result += 0.025 * np.sin(5.97 * phase) * np.exp(-13.0 * t)
    return result * gate(t, 0.006, 0.15)


def pad(midi: int, duration: float) -> np.ndarray:
    t = times(duration)
    f = frequency(midi)
    result = 0.52 * np.sin(2 * math.pi * f * t)
    result += 0.28 * np.sin(2 * math.pi * f * 1.0012 * t)
    result += 0.09 * np.sin(2 * math.pi * f * 1.9985 * t)
    result *= 0.96 + 0.04 * np.sin(2 * math.pi * 0.41 * t)
    return result * gate(t, 0.7, 1.1)


def bass(midi: int, duration: float) -> np.ndarray:
    t = times(duration)
    phase = 2 * math.pi * frequency(midi) * t
    return (np.sin(phase) + 0.09 * np.sin(phase * 2)) * np.exp(-2.1 * t) * gate(t, 0.025, 0.16)


def pulse() -> np.ndarray:
    t = times(0.26)
    phase = 2 * math.pi * (48 * t + 19 * 0.045 * (1 - np.exp(-t / 0.045)))
    return np.sin(phase) * np.exp(-18 * t) * gate(t, 0.007, 0.035)


def filtered_noise(rng: np.random.Generator, duration: float, centre: float, width: float) -> np.ndarray:
    n = round(duration * RATE)
    spectrum = np.fft.rfft(rng.standard_normal(n))
    hz = np.fft.rfftfreq(n, 1 / RATE)
    spectral_gate = np.exp(-0.5 * ((hz - centre) / width) ** 2)
    result = np.fft.irfft(spectrum * spectral_gate, n)
    result /= max(float(np.sqrt(np.mean(result * result))), 1e-12)
    return result


def whisper_tick(rng: np.random.Generator) -> np.ndarray:
    t = times(0.09)
    noise = filtered_noise(rng, 0.09, 4300, 1900)
    return noise * np.exp(-60 * t) * gate(t, 0.002, 0.025)


def airy_sweep(rng: np.random.Generator, duration: float, warm: bool = False) -> np.ndarray:
    t = times(duration)
    noise = filtered_noise(rng, duration, 950 if warm else 1800, 650 if warm else 1150)
    envelope = np.sin(math.pi * t / duration) ** 2
    # A breathy sweep rather than a conspicuous cinematic impact.
    return noise * envelope * (0.72 + 0.28 * np.cos(2 * math.pi * 1.0 * t))


def paw(rng: np.random.Generator, pitch: float) -> np.ndarray:
    t = times(0.080)
    noise = filtered_noise(rng, 0.080, 1150, 750)
    wooden = np.sin(2 * math.pi * pitch * t) * np.exp(-74 * t)
    plush = noise * np.exp(-65 * t)
    return (wooden * 0.66 + plush * 0.14) * gate(t, 0.004, 0.018)


def click() -> np.ndarray:
    # Exact documented app waveform, with its 60ms duration at this WAV's rate.
    t = times(0.06)
    envelope = np.minimum(t / 0.003, 1) * (1 - t / 0.06) ** 2
    return 0.1 * envelope * (
        np.sin(2 * math.pi * 1046.5 * t) + 0.18 * np.sin(2 * math.pi * 1568 * t)
    )


def metrics(signal: np.ndarray) -> dict:
    peak = float(np.max(np.abs(signal)))
    rms = float(np.sqrt(np.mean(signal * signal)))
    return {
        "duration_seconds": len(signal) / RATE,
        "sample_rate_hz": RATE,
        "channels": 2,
        "peak_amplitude": peak,
        "peak_dbfs": 20 * math.log10(max(peak, 1e-12)),
        "rms_amplitude": rms,
        "rms_dbfs": 20 * math.log10(max(rms, 1e-12)),
        "channel_rms_amplitude": [float(value) for value in np.sqrt(np.mean(signal * signal, axis=0))],
        "finite": bool(np.isfinite(signal).all()),
        "clipped_samples": int(np.count_nonzero(np.abs(signal) >= 1)),
    }


def write_wave(path: Path, signal: np.ndarray) -> dict:
    assert len(signal) == FRAMES and np.isfinite(signal).all()
    assert np.max(np.abs(signal)) < 1, f"Clipping before conversion: {path}"
    pcm = np.rint(signal * 32767).astype("<i2")
    pcm[0] = 0
    pcm[-1] = 0
    with wave.open(str(path), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm.tobytes())
    return metrics(pcm.astype(np.float64) / 32768)


def compose(args: argparse.Namespace) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    rng = np.random.default_rng(SEED)
    instruments = np.zeros((FRAMES, 2), dtype=np.float64)
    percussion = np.zeros_like(instruments)
    effects = np.zeros_like(instruments)
    events: list[dict] = []

    for bar in range(14):
        at = bar * BAR
        name, notes, root = CHORDS[bar % len(CHORDS)]
        intensity = 0.65 if bar == 0 else 0.83 if bar == 1 else 1.0
        if bar >= 12:
            intensity *= 0.88
        for idx, note in enumerate(notes):
            add(instruments, pad(note, BAR + 0.8), at, 0.017, (idx - 2) * 0.24)
            add(instruments, bell(note, 1.9), at + 0.12 + idx * 0.011, 0.030 * intensity, (idx - 2) * 0.20)
        for idx, (beat, note) in enumerate(MOTIFS[bar % len(MOTIFS)]):
            add(instruments, bell(note), at + beat * BEAT, 0.118 * intensity, 0.22 * math.sin(bar + idx * 1.7))
        for beat in (0, 2.5):
            add(instruments, bass(root, 1.05), at + beat * BEAT, 0.165 * intensity)
        if bar >= 2:
            for beat in (0, 2):
                add(percussion, pulse(), at + beat * BEAT, 0.11 * intensity)
            # Almost tactile shaker pulse, low enough to leave UI ticks clear.
            for eighth in range(8):
                add(percussion, whisper_tick(rng), at + eighth * BEAT / 2 + (0.012 if eighth % 2 else 0),
                    (0.0080 if eighth % 2 else 0.0045) * intensity,
                    0.42 if eighth % 2 else -0.42)
        events.append({"kind": "music_harmony", "time_seconds": at, "chord": name})

    # A long airy resolution arrives with the white outro. No rhythmic music
    # beneath the tiny running feet, so the comic movement feels unhurried.
    for idx, note in enumerate(CHORDS[0][1]):
        add(instruments, pad(note, 6.0), 33.6, 0.028, (idx - 2) * 0.21)
    add(instruments, bass(38, 3), 33.75, 0.065)
    for delay, gain in ((0.13, 0.09), (0.29, 0.06), (0.47, 0.04), (0.71, 0.025)):
        frame_delay = round(delay * RATE)
        instruments[frame_delay:] += instruments[:-frame_delay, ::-1].copy() * gain
    music = instruments + percussion
    timeline = np.arange(FRAMES) / RATE
    music *= np.sin(np.clip(timeline / 1.1, 0, 1) * math.pi / 2)[:, None] ** 2
    music *= np.cos(np.clip((timeline - 39.3) / 0.7, 0, 1) * math.pi / 2)[:, None] ** 2
    music *= 10 ** (-23.0 / 20) / np.sqrt(np.mean(music * music))

    # Entrance and camera movement sounds are independently generated stereo
    # sweeps; their direction matches the alternating orbit and dolly movement.
    entrance = airy_sweep(rng, 1.35)
    add(effects, entrance, 0.15, 0.024, -0.35)
    add(effects, entrance, 0.23, 0.018, 0.48)
    events.append({"kind": "phone_arrival_airy_sweep", "time_seconds": 0.15, "duration_seconds": 1.43})
    add(effects, bell(86, 1.9), 1.15, 0.065, 0.08)
    for idx, onset in enumerate(args.camera_sweeps):
        add(effects, airy_sweep(rng, 0.6), onset - 0.18, 0.016, (-1 if idx % 2 else 1) * 0.48)
        events.append({"kind": "camera_sweep", "time_seconds": onset - 0.18, "duration_seconds": 0.6})
    exit_start = args.phone_end - 0.18
    add(effects, airy_sweep(rng, 0.72, warm=True), exit_start, 0.024, 0.22)
    events.append({"kind": "phone_exit_sweep", "time_seconds": exit_start, "duration_seconds": 0.72})

    source_meta = json.loads(args.capture.read_text(encoding="utf-8"))
    for event in source_meta["audioClicks"]:
        source_time = event.get("t", event["relativeSeconds"])
        if not args.source_start <= source_time < args.source_end:
            continue
        destination = args.phone_start + (source_time - args.source_start) * (
            (args.phone_end - args.phone_start) / (args.source_end - args.source_start)
        )
        # Preserve the exact code-generated click timbre and 60ms duration;
        # only its measured onset is edited to follow the screen's timeline.
        add(effects, click(), destination, math.sqrt(2), 0)
        events.append({"kind": "actual_app_click", "source_seconds": source_time,
                       "time_seconds": destination, "duration_seconds": 0.06,
                       "waveform_source": "apps/mobile/src/features/sound/waveform.ts"})

    # Flitting hat: two soft airy motions, followed by alternating plush wooden
    # taps for Rumo's little claws. No recordings or cartoon stock effects.
    for onset, duration, pan in ((34.6, 0.8, -0.25), (35.8, 0.8, 0.4), (37.25, 0.65, 0.64)):
        add(effects, airy_sweep(rng, duration, warm=True), onset, 0.015, pan)
        events.append({"kind": "hat_wind", "time_seconds": onset, "duration_seconds": duration})
    foot_times = np.arange(args.paw_start, args.paw_end, args.paw_period)
    for idx, onset in enumerate(foot_times):
        progress = idx / max(1, len(foot_times) - 1)
        pan = -0.35 + progress * 0.76
        velocity = 0.07 * (0.89 + 0.11 * math.sin(idx * 2.3))
        add(effects, paw(rng, 440 + 36 * (idx % 2) + 18 * math.sin(idx)), float(onset), velocity, pan)
        events.append({"kind": "rumo_claw_patter", "time_seconds": float(onset), "duration_seconds": 0.08})

    for onset, note, gain, pan in ((35.5, 86, 0.049, -0.22), (35.76, 81, 0.039, 0.23),
                                  (36.04, 78, 0.047, 0.0), (38.4, 86, 0.071, -0.12),
                                  (38.4, 78, 0.051, 0.12), (38.4, 74, 0.072, 0)):
        add(effects, bell(note, 2.8), onset, gain, pan)
        events.append({"kind": "wordmark_resolution_chime", "time_seconds": onset, "midi_note": note})

    # A shared final fade prevents a click at the exact 40s delivery boundary.
    effects *= np.cos(np.clip((timeline - 39.3) / 0.7, 0, 1) * math.pi / 2)[:, None] ** 2
    return music, effects, sorted(events, key=lambda event: event["time_seconds"])


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=root / "artifacts/reel-v2")
    parser.add_argument("--capture", type=Path, default=root / "artifacts/reel/capture.json")
    parser.add_argument("--source-start", type=float, default=0)
    parser.add_argument("--source-end", type=float, default=38)
    parser.add_argument("--phone-start", type=float, default=1.8)
    parser.add_argument("--phone-end", type=float, default=33.25)
    parser.add_argument("--paw-start", type=float, default=35.1)
    parser.add_argument("--paw-end", type=float, default=38.4)
    parser.add_argument("--paw-period", type=float, default=0.14)
    parser.add_argument("--camera-sweeps", type=float, nargs="*", default=[8.5, 13.5, 20, 26.5])
    args = parser.parse_args()
    assert 0 <= args.source_start < args.source_end
    assert 0 <= args.phone_start < args.phone_end <= DURATION
    assert 0 <= args.paw_start < args.paw_end <= DURATION
    args.output_dir.mkdir(parents=True, exist_ok=True)
    music, effects, events = compose(args)
    mix = music + effects
    raw_rms = float(np.sqrt(np.mean(mix * mix)))
    raw_peak = float(np.max(np.abs(mix)))
    master_gain = min(10 ** (-19.0 / 20) / raw_rms, 0.78 / raw_peak)
    music *= master_gain
    effects *= master_gain
    audio = music + effects
    info = {
        "title": "A Little Further — Cinematic Product Cue",
        "authorship": "Original instrumental composition and mathematically synthesized sound design created for 1 Month Trip. No third-party songs, recordings, samples, vocals, or artist imitation.",
        "reuse": "Project-original audio and synthesis script for 1 Month Trip previews and marketing. No external audio attribution required.",
        "composition": {"bpm": BPM, "key": "D major", "chord_cycle": [c[0] for c in CHORDS],
                        "instruments": ["warm electric-piano mallet", "airy sine pad", "rounded bass", "soft low pulse", "breathy quiet shaker"],
                        "outro": "Dmaj9 airy resolution, soft wooden claw patter, original sparkling wordmark chime"},
        "timeline_mapping": {"source_start_seconds": args.source_start, "source_end_seconds": args.source_end,
                             "phone_start_seconds": args.phone_start, "phone_end_seconds": args.phone_end,
                             "equation": "video = phone_start + (source - source_start) * (phone_end - phone_start) / (source_end - source_start)"},
        "click_count": sum(event["kind"] == "actual_app_click" for event in events),
        "source_click_count": len(json.loads(args.capture.read_text(encoding="utf-8"))["audioClicks"]),
        "click_waveform_matches_code": True,
        "master_gain": master_gain,
        "output": {
            "music.wav": write_wave(args.output_dir / "music.wav", music),
            "effects.wav": write_wave(args.output_dir / "effects.wav", effects),
            "audio.wav": write_wave(args.output_dir / "audio.wav", audio),
        },
        "events": events,
    }
    (args.output_dir / "cinematic-audio-info.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output_dir / "audio.wav"), "click_count": info["click_count"],
                      **info["output"]["audio.wav"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
