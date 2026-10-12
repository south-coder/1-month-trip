#!/usr/bin/env python3
"""Compose and synthesize the original 40-second 1 Month Trip reel score.

No source recordings, copied melodies, provider APIs, or network access are used.
Requires Python 3 and NumPy. Outputs a stereo PCM WAV and composition metadata.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import wave

import numpy as np


SAMPLE_RATE = 48_000
DURATION_SECONDS = 40.0
BPM = 96
BEAT_SECONDS = 60.0 / BPM
BAR_SECONDS = BEAT_SECONDS * 4
BAR_COUNT = 16
SEED = 20261012
TARGET_RMS = 10 ** (-25.0 / 20.0)
PEAK_LIMIT = 0.24

# The harmony, melody, and arrangement below were newly composed for this reel.
# Four warm, open voicings; MIDI note numbers, with a separate lower bass root.
CHORDS = (
    {"name": "Dmaj9", "notes": (62, 66, 69, 73, 76), "bass": 38},
    {"name": "Bm7", "notes": (59, 62, 66, 69, 74), "bass": 35},
    {"name": "Gmaj9", "notes": (55, 59, 62, 66, 69), "bass": 31},
    {"name": "Aadd9", "notes": (57, 61, 64, 69, 71), "bass": 33},
)

# Per-bar (beat offset, MIDI pitch, length in beats). The motif develops over
# sixteen bars instead of quoting a song or imitating a named performer.
MELODY = (
    ((1.0, 78, 0.5), (2.0, 76, 0.5), (3.0, 74, 0.75)),
    ((0.5, 71, 0.5), (1.25, 74, 0.5), (2.0, 78, 0.75), (3.25, 74, 0.5)),
    ((0.0, 71, 0.5), (0.75, 74, 0.5), (1.5, 78, 0.75), (2.75, 76, 0.5), (3.5, 74, 0.25)),
    ((0.0, 73, 0.5), (0.75, 76, 0.5), (1.5, 71, 0.75), (2.75, 73, 0.5), (3.5, 69, 0.25)),
    ((0.0, 74, 0.5), (0.75, 78, 0.5), (1.5, 76, 0.5), (2.5, 81, 0.5), (3.25, 78, 0.5)),
    ((0.0, 71, 0.5), (0.5, 74, 0.5), (1.25, 78, 0.75), (2.25, 76, 0.5), (3.0, 74, 0.75)),
    ((0.0, 79, 0.5), (0.75, 78, 0.5), (1.5, 74, 0.75), (2.5, 71, 0.5), (3.25, 74, 0.5)),
    ((0.0, 76, 0.75), (1.0, 73, 0.5), (1.75, 71, 0.5), (2.75, 73, 0.5), (3.5, 76, 0.25)),
    ((0.0, 78, 0.5), (0.75, 81, 0.75), (1.75, 78, 0.5), (2.5, 76, 0.5), (3.25, 74, 0.5)),
    ((0.0, 74, 0.5), (0.75, 78, 0.5), (1.5, 81, 0.75), (2.5, 78, 0.5), (3.25, 74, 0.5)),
    ((0.0, 71, 0.5), (0.75, 74, 0.5), (1.5, 78, 0.5), (2.25, 79, 0.5), (3.0, 78, 0.75)),
    ((0.0, 76, 0.5), (0.75, 73, 0.5), (1.5, 71, 0.75), (2.5, 69, 0.5), (3.25, 73, 0.5)),
    ((0.0, 74, 0.75), (1.0, 78, 0.5), (1.75, 81, 0.5), (2.75, 78, 0.75)),
    ((0.0, 78, 0.75), (1.0, 74, 0.5), (1.75, 71, 0.75), (2.75, 74, 0.75)),
    ((0.0, 79, 0.75), (1.0, 78, 0.5), (1.75, 74, 0.75), (2.75, 71, 0.75)),
    # The final bar resolves to Dmaj9, matching the final visual sign-off.
    ((0.0, 76, 0.5), (0.75, 78, 0.5), (1.5, 74, 2.0)),
)


def frequency(midi: int) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def timeline(seconds: float) -> np.ndarray:
    return np.arange(max(1, round(seconds * SAMPLE_RATE)), dtype=np.float64) / SAMPLE_RATE


def smooth_gate(t: np.ndarray, attack: float, release: float) -> np.ndarray:
    rising = np.sin(np.minimum(t / attack, 1.0) * math.pi / 2.0) ** 2
    remaining = (len(t) - 1) / SAMPLE_RATE - t
    falling = np.sin(np.clip(remaining / release, 0.0, 1.0) * math.pi / 2.0) ** 2
    return rising * falling


def mallet(midi: int, seconds: float) -> np.ndarray:
    t = timeline(seconds + 0.5)
    f = frequency(midi)
    # Fundamental plus quickly fading wooden partials, with rounded attacks.
    sound = np.sin(2 * math.pi * f * t) * np.exp(-5.2 * t)
    sound += 0.25 * np.sin(2 * math.pi * f * 3.0 * t) * np.exp(-12.0 * t)
    sound += 0.075 * np.sin(2 * math.pi * f * 6.05 * t) * np.exp(-24.0 * t)
    return sound * smooth_gate(t, 0.004, 0.10)


def warm_key(midi: int, seconds: float) -> np.ndarray:
    t = timeline(seconds + 0.7)
    f = frequency(midi)
    phase = 2 * math.pi * f * t
    sound = np.sin(phase + 0.42 * np.sin(phase * 2) * np.exp(-4.2 * t))
    sound += 0.14 * np.sin(phase * 2) * np.exp(-3.2 * t)
    sound += 0.045 * np.sin(phase * 3) * np.exp(-7.0 * t)
    tremolo = 0.94 + 0.06 * np.sin(2 * math.pi * 3.2 * t)
    return sound * np.exp(-2.0 * t) * smooth_gate(t, 0.009, 0.16) * tremolo


def airy_pad(midi: int, seconds: float) -> np.ndarray:
    t = timeline(seconds + 0.35)
    f = frequency(midi)
    sound = 0.55 * np.sin(2 * math.pi * f * t)
    sound += 0.25 * np.sin(2 * math.pi * (f * 1.0018) * t)
    sound += 0.10 * np.sin(2 * math.pi * f * 2 * t)
    return sound * smooth_gate(t, 0.48, 0.7)


def bass(midi: int, seconds: float) -> np.ndarray:
    t = timeline(seconds)
    f = frequency(midi)
    phase = 2 * math.pi * f * t
    sound = np.sin(phase) + 0.16 * np.sin(2 * phase) + 0.065 * np.sin(3 * phase)
    return np.tanh(sound * 1.15) * np.exp(-1.8 * t) * smooth_gate(t, 0.012, 0.12)


def kick() -> np.ndarray:
    t = timeline(0.28)
    phase = 2 * math.pi * (48 * t + 43 * 0.035 * (1 - np.exp(-t / 0.035)))
    return np.sin(phase) * np.exp(-15 * t) * smooth_gate(t, 0.002, 0.04)


def brushed_clap(rng: np.random.Generator) -> np.ndarray:
    t = timeline(0.18)
    noise = rng.standard_normal(len(t))
    band = np.convolve(noise, np.ones(5) / 5, mode="same")
    band -= np.convolve(noise, np.ones(35) / 35, mode="same")
    pulse = np.exp(-t * 32)
    pulse += 0.40 * np.exp(-np.maximum(t - 0.014, 0) * 40) * (t >= 0.014)
    rim = 0.075 * np.sin(2 * math.pi * 890 * t) * np.exp(-55 * t)
    return (band * pulse + rim) * smooth_gate(t, 0.003, 0.045)


def shaker(rng: np.random.Generator, long: bool = False) -> np.ndarray:
    t = timeline(0.14 if long else 0.075)
    noise = rng.standard_normal(len(t))
    high = (noise - np.roll(noise, 1)) * 0.45
    return high * np.exp(-t * (33 if long else 62)) * smooth_gate(t, 0.002, 0.024)


def add_voice(
    mix: np.ndarray,
    voice: np.ndarray,
    start_seconds: float,
    gain: float,
    pan: float = 0.0,
) -> None:
    start = round(start_seconds * SAMPLE_RATE)
    if start >= len(mix) or start < 0:
        return
    count = min(len(voice), len(mix) - start)
    angle = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
    mix[start : start + count, 0] += voice[:count] * gain * math.cos(angle)
    mix[start : start + count, 1] += voice[:count] * gain * math.sin(angle)


def compose() -> tuple[np.ndarray, dict]:
    frame_count = round(SAMPLE_RATE * DURATION_SECONDS)
    instruments = np.zeros((frame_count, 2), dtype=np.float64)
    rhythm = np.zeros_like(instruments)
    rng = np.random.default_rng(SEED)

    for bar in range(BAR_COUNT):
        at = bar * BAR_SECONDS
        chord = CHORDS[0 if bar == BAR_COUNT - 1 else bar % len(CHORDS)]
        intensity = 0.70 if bar < 2 else 1.0
        if bar >= 14:
            intensity *= 0.82

        # Sustained texture and offbeat warm-key comping leave room for melody.
        for index, midi in enumerate(chord["notes"]):
            add_voice(instruments, airy_pad(midi, BAR_SECONDS), at, 0.017, (index - 2) * 0.18)
        comp_beats = (0.0, 1.5, 2.75) if bar >= 2 else (0.0, 2.0)
        for hit, beat in enumerate(comp_beats):
            for index, midi in enumerate(chord["notes"]):
                add_voice(
                    instruments,
                    warm_key(midi, 0.75 * BEAT_SECONDS),
                    at + beat * BEAT_SECONDS + index * 0.006,
                    0.056 * intensity * (0.82 if hit else 1),
                    (index - 2) * 0.19,
                )

        for note_index, (beat, midi, length) in enumerate(MELODY[bar]):
            add_voice(
                instruments,
                mallet(midi, length * BEAT_SECONDS),
                at + beat * BEAT_SECONDS,
                0.175 * intensity * (1.0 if note_index % 2 == 0 else 0.90),
                0.10 * math.sin(bar * 1.7 + note_index),
            )

        bass_beats = ((0.0, 0), (2.0, 0), (3.5, 12))
        if bar == BAR_COUNT - 1:
            bass_beats = ((0.0, 0), (1.5, 0))
        for beat, octave in bass_beats:
            add_voice(
                instruments,
                bass(chord["bass"] + octave, BEAT_SECONDS * (0.6 if octave else 1.4)),
                at + beat * BEAT_SECONDS,
                0.205 * intensity,
            )

        if bar >= 2:
            kick_beats = (0.0, 2.0, 3.5) if bar % 4 == 3 else (0.0, 2.0)
            if bar >= 14:
                kick_beats = (0.0, 2.0)
            for beat in kick_beats:
                add_voice(rhythm, kick(), at + beat * BEAT_SECONDS, 0.21 * intensity)
            for beat in (1.0, 3.0):
                add_voice(rhythm, brushed_clap(rng), at + beat * BEAT_SECONDS, 0.108 * intensity, 0.06)
            for eighth in range(8):
                # Tiny offbeat delay adds a relaxed groove without a loud hat.
                swing = 0.017 if eighth % 2 else 0.0
                velocity = 0.031 if eighth % 2 else 0.021
                add_voice(
                    rhythm,
                    shaker(rng, long=eighth == 7),
                    at + eighth * 0.5 * BEAT_SECONDS + swing,
                    velocity * intensity,
                    -0.27 if eighth % 2 else 0.27,
                )

    # Quiet stereo early reflections and two diffused tails, made from our own
    # instrument synthesis. Keep low-frequency rhythm dry and centered.
    ambient = instruments.copy()
    for delay_seconds, level, swap in (
        (0.105, 0.10, True),
        (0.205, 0.075, True),
        (0.337, 0.055, False),
        (0.491, 0.030, True),
    ):
        delay = round(delay_seconds * SAMPLE_RATE)
        source = instruments[:-delay, ::-1] if swap else instruments[:-delay]
        ambient[delay:] += source * level
    mix = ambient + rhythm

    intro_frames = round(1.25 * SAMPLE_RATE)
    outro_frames = round(2.8 * SAMPLE_RATE)
    mix[:intro_frames] *= np.sin(np.linspace(0, math.pi / 2, intro_frames))[:, None] ** 2
    mix[-outro_frames:] *= np.cos(np.linspace(0, math.pi / 2, outro_frames))[:, None] ** 2
    mix -= np.mean(mix, axis=0, keepdims=True)
    # Apply a short second boundary gate after DC removal for exact silence.
    boundary = round(0.01 * SAMPLE_RATE)
    mix[:boundary] *= np.linspace(0, 1, boundary)[:, None]
    mix[-boundary:] *= np.linspace(1, 0, boundary)[:, None]

    raw_rms = float(np.sqrt(np.mean(mix * mix)))
    raw_peak = float(np.max(np.abs(mix)))
    gain = min(TARGET_RMS / raw_rms, PEAK_LIMIT / raw_peak)
    mix *= gain
    # Deterministic TPDF dither at one least-significant-bit scale.
    dither = (rng.random(mix.shape) - rng.random(mix.shape)) / 32768.0
    pcm = np.rint((mix + dither) * 32767).astype("<i2")
    pcm[0] = 0
    pcm[-1] = 0
    actual = pcm.astype(np.float64) / 32768.0
    peak = float(np.max(np.abs(actual)))
    rms = float(np.sqrt(np.mean(actual * actual)))
    channel_rms = np.sqrt(np.mean(actual * actual, axis=0))

    assert len(pcm) == 1_920_000, "The score must be exactly 40 seconds."
    assert np.isfinite(mix).all(), "Synthesis produced invalid samples."
    assert peak < 1.0, "Audio clipping detected."

    info = {
        "title": "Small Steps, Bright Trip",
        "authorship": "Original instrumental composition, arrangement, and synthesis created by Codex for the 1 Month Trip app reel. No third-party samples, songs, recordings, vocals, or performer emulation are used.",
        "reuse": "This project-original score and its deterministic synthesis script may be reused and adapted for 1 Month Trip previews and marketing; no external audio attribution is required by this composition.",
        "duration_seconds": len(pcm) / SAMPLE_RATE,
        "sample_rate_hz": SAMPLE_RATE,
        "channels": 2,
        "pcm_bits": 16,
        "frame_count": len(pcm),
        "peak_amplitude": peak,
        "peak_dbfs": 20 * math.log10(peak),
        "rms_amplitude": rms,
        "rms_dbfs": 20 * math.log10(rms),
        "channel_rms_amplitude": [float(value) for value in channel_rms],
        "clipped_sample_count": int(np.count_nonzero(np.abs(actual) >= 1.0)),
        "parameters": {
            "bpm": BPM,
            "time_signature": "4/4",
            "key": "D major",
            "bars": BAR_COUNT,
            "chord_cycle": [chord["name"] for chord in CHORDS],
            "final_chord": "Dmaj9",
            "instruments": ["original synthesized marimba", "warm electric keys", "airy sine pad", "rounded bass", "soft kick", "brushed clap", "quiet shaker"],
            "intro_fade_seconds": 1.25,
            "outro_fade_seconds": 2.8,
            "target_rms_dbfs": -25.0,
            "maximum_peak_amplitude": PEAK_LIMIT,
            "random_seed": SEED,
            "melody_midi_events_by_bar": [list(bar) for bar in MELODY],
            "synthesis_notes": "All voices are generated mathematically with NumPy. Constant-power stereo panning, gentle stereo reflections, smooth note gates, deterministic TPDF dither. Mix level leaves headroom for app click effects and captions.",
        },
    }
    return pcm, info


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "artifacts" / "reel",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    pcm, info = compose()
    wav_path = args.output_dir / "music.wav"
    with wave.open(str(wav_path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())
    (args.output_dir / "music-info.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"output": str(wav_path), "duration_seconds": info["duration_seconds"], "peak_dbfs": info["peak_dbfs"], "rms_dbfs": info["rms_dbfs"], "clipped_sample_count": info["clipped_sample_count"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
