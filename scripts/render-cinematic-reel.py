"""Project the verified browser recording onto a gently orbiting physical phone.

The screen is never reconstructed or edited: pixels come from source-timed.mp4,
which preserves the original browser frames and their measured capture times.
Only the product shell, lighting, studio background and camera are synthesized.
This creates a silent 40 s base; compose-cinematic-reel.py adds titles and audio.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

# The cloud setup can install the video-only requirements into this local path.
video_deps = Path('/workspace/video-deps')
if video_deps.is_dir():
    sys.path.insert(0, str(video_deps))

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/reel'
OUTPUT = ROOT / 'artifacts/reel-cinematic'
WIDTH, HEIGHT, FPS, DURATION = 1080, 1920, 30, 40
DEMO_START, DEMO_END, SOURCE_END = 1.8, 33.25, 38.0
SOURCE_SPEED = SOURCE_END / (DEMO_END - DEMO_START)
SCREEN_W, SCREEN_H = 720, 1374


def ease(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3 - 2 * value)


def mapped_time(source_time: float) -> float:
    return DEMO_START + source_time / SOURCE_SPEED


# time, yaw degrees, pitch degrees, roll degrees, size, x, y
# The opening has one complete turn. During controls and answer feedback the
# phone is nearly frontal. Stronger turns happen before/after the actual taps.
CAMERA_KEYS = [
    (0.00, -28, 18, -12, 0.32, 540, 1425),
    (0.28, -18, 12, -8, 0.78, 540, 1170),
    (0.60, 60, 10, -3, 0.96, 540, 1115),
    (0.93, 175, 8, 2, 0.96, 540, 1110),
    (1.26, 280, 7, 4, 0.98, 540, 1110),
    (1.62, 350, 4, 2, 1.00, 540, 1110),
    (1.80, 367, 3, 1, 1.00, 540, 1110),
    (2.75, 362, 2, 0, 1.01, 540, 1110),
    (4.30, 349, -2, -2, 1.01, 540, 1110),
    (5.45, 365, 2, 1, 1.02, 540, 1105),
    (8.40, 361, 1, 0, 1.03, 540, 1105),
    (10.55, 343, -3, -2, 1.00, 540, 1110),
    (11.85, 364, 2, 1, 1.02, 540, 1108),
    (14.30, 361, 0, 0, 1.03, 540, 1108),
    (15.50, 376, 3, 2, 1.00, 540, 1105),
    (17.10, 362, 1, 0, 1.04, 540, 1100),
    (20.95, 360, 0, 0, 1.055, 540, 1095),
    (23.35, 354, -2, -1, 1.035, 540, 1100),
    (24.65, 374, 3, 2, 1.00, 540, 1110),
    (26.10, 363, 1, 0, 1.025, 540, 1105),
    (28.55, 358, -1, -1, 1.025, 540, 1105),
    (29.25, 346, -2, -2, 1.00, 540, 1110),
    (30.10, 363, 2, 1, 1.025, 540, 1105),
    (32.70, 360, 0, 0, 1.025, 540, 1105),
    (33.25, 347, -2, -2, 0.98, 540, 1115),
    (33.92, 285, 9, -8, 0.56, 540, 1190),
    (34.00, 275, 12, -10, 0.48, 540, 1200),
]


def camera(t: float) -> tuple[float, ...]:
    if t <= CAMERA_KEYS[0][0]:
        return CAMERA_KEYS[0][1:]
    for a, b in zip(CAMERA_KEYS, CAMERA_KEYS[1:]):
        if a[0] <= t <= b[0]:
            fraction = ease((t - a[0]) / (b[0] - a[0]))
            return tuple(x + (y - x) * fraction for x, y in zip(a[1:], b[1:]))
    return CAMERA_KEYS[-1][1:]


def rotation(yaw: float, pitch: float, roll: float) -> np.ndarray:
    yaw, pitch, roll = map(math.radians, (yaw, pitch, roll))
    sy, cy = math.sin(yaw), math.cos(yaw)
    sx, cx = math.sin(pitch), math.cos(pitch)
    sz, cz = math.sin(roll), math.cos(roll)
    rx = np.array(((1, 0, 0), (0, cx, -sx), (0, sx, cx)))
    ry = np.array(((cy, 0, sy), (0, 1, 0), (-sy, 0, cy)))
    rz = np.array(((cz, -sz, 0), (sz, cz, 0), (0, 0, 1)))
    return rz @ ry @ rx


def rounded_points(x: float, y: float, w: float, h: float,
                   r: float, z: float, samples: int = 12) -> np.ndarray:
    result = []
    for center_x, center_y, start in (
        (x + w / 2 - r, y + h / 2 - r, 0),
        (x - w / 2 + r, y + h / 2 - r, 90),
        (x - w / 2 + r, y - h / 2 + r, 180),
        (x + w / 2 - r, y - h / 2 + r, 270),
    ):
        for theta in np.linspace(start, start + 90, samples):
            rad = math.radians(theta)
            result.append((center_x + r * math.cos(rad),
                           center_y + r * math.sin(rad), z))
    return np.asarray(result, dtype=np.float64)


def polygon(frame: np.ndarray, points: np.ndarray, color: tuple[int, ...],
            thickness: int = 0) -> None:
    points = np.round(points).astype(np.int32)
    if thickness:
        cv2.polylines(frame, [points], True, color, thickness, cv2.LINE_AA)
    else:
        cv2.fillPoly(frame, [points], color, cv2.LINE_AA)


class StudioPhone:
    def __init__(self) -> None:
        self.outer_front = rounded_points(0, 0, 7.30, 14.00, .56, .20)
        self.outer_back = rounded_points(0, 0, 7.30, 14.00, .56, -.20)
        self.screen_vertices = np.asarray([
            (-3.475, -6.625, .222), (3.475, -6.625, .222),
            (3.475, 6.625, .222), (-3.475, 6.625, .222)])
        self.texture_vertices = np.float32([
            (0, 0), (SCREEN_W - 1, 0),
            (SCREEN_W - 1, SCREEN_H - 1), (0, SCREEN_H - 1)])
        mask = np.zeros((SCREEN_H, SCREEN_W), dtype=np.uint8)
        cv2.rectangle(mask, (40, 0), (SCREEN_W - 40, SCREEN_H - 1), 255, -1)
        cv2.rectangle(mask, (0, 40), (SCREEN_W - 1, SCREEN_H - 40), 255, -1)
        for x, y in ((40, 40), (SCREEN_W - 41, 40),
                     (40, SCREEN_H - 41), (SCREEN_W - 41, SCREEN_H - 41)):
            cv2.circle(mask, (x, y), 40, 255, -1, cv2.LINE_AA)
        self.screen_mask = mask
        self.back_mask = np.zeros((SCREEN_H, SCREEN_W), dtype=np.uint8)
        back_radius = 55
        cv2.rectangle(self.back_mask, (back_radius, 0),
                      (SCREEN_W - back_radius, SCREEN_H - 1), 255, -1)
        cv2.rectangle(self.back_mask, (0, back_radius),
                      (SCREEN_W - 1, SCREEN_H - back_radius), 255, -1)
        for x, y in ((back_radius, back_radius),
                     (SCREEN_W - 1 - back_radius, back_radius),
                     (back_radius, SCREEN_H - 1 - back_radius),
                     (SCREEN_W - 1 - back_radius, SCREEN_H - 1 - back_radius)):
            cv2.circle(self.back_mask, (x, y), back_radius, 255, -1, cv2.LINE_AA)
        # The rear case catches a long softbox: a restrained satin gradient and
        # very fine machining texture, all independent of the real app pixels.
        v, u = np.mgrid[0:SCREEN_H, 0:SCREEN_W].astype(np.float32)
        u /= SCREEN_W
        v /= SCREEN_H
        long_light = np.exp(-((u - .72 - .08 * v) / .17) ** 2)
        broad_light = np.exp(-((u - .25) / .7) ** 2 - ((v - .2) / .8) ** 2)
        edge_shade = 5 * (np.abs(u - .5) * 2) ** 5
        satin = .35 * np.sin(v * SCREEN_H * 1.33)
        rear = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.float32)
        rear[:] = (205, 216, 210)
        rear += (long_light * 11 + broad_light * 6 - edge_shade + satin)[..., None]
        self.back_texture = np.clip(rear, 0, 255).astype(np.uint8)
        self.back_vertices = np.asarray([
            (-3.65, -7.0, -.201), (3.65, -7.0, -.201),
            (3.65, 7.0, -.201), (-3.65, 7.0, -.201)])
        # Studio illumination is deliberately restrained; full-white end card
        # remains completely clean for the independently rendered Rumo action.
        yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
        cool = np.exp(-((xx - 110) ** 2 / 460**2 + (yy - 950) ** 2 / 770**2))
        warm = np.exp(-((xx - 1010) ** 2 / 550**2 + (yy - 1480) ** 2 / 850**2))
        bg = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
        bg[:] = (250, 251, 249)
        bg -= cool[..., None] * np.asarray((12, 7, 11))
        bg -= warm[..., None] * np.asarray((0, 3, 7))
        self.background = np.clip(bg, 0, 255).astype(np.uint8)
        shadow = np.zeros((180, 800), dtype=np.float32)
        cv2.ellipse(shadow, (400, 90), (272, 20), 0, 0, 360, .15, -1)
        self.shadow = cv2.GaussianBlur(shadow, (0, 0), 20)

    def project(self, points: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        rotated = points @ self.r.T
        unit = self.focal / (22.0 - rotated[:, 2])
        projected = np.stack((self.cx + unit * rotated[:, 0],
                              self.cy + unit * rotated[:, 1]), axis=1)
        return projected, rotated

    def draw_world(self, image: np.ndarray, points: np.ndarray,
                   color: tuple[int, int, int], thickness: int = 0) -> None:
        polygon(image, self.project(points)[0], color, thickness)

    def lens(self, frame: np.ndarray, x: float, y: float, radius: float,
             z: float, color: tuple[int, int, int]) -> None:
        points = np.asarray([(x + radius * math.cos(theta),
                              y + radius * math.sin(theta), z)
                             for theta in np.linspace(0, 2 * math.pi, 40)])
        self.draw_world(frame, points, color)

    def back(self, frame: np.ndarray) -> None:
        self.draw_world(frame, self.outer_back, (210, 219, 214))
        self.warp_texture(frame, self.back_texture, self.back_vertices, self.back_mask)
        self.draw_world(frame, self.outer_back, (239, 244, 240), 2)
        bump = rounded_points(1.95, -4.69, 2.62, 3.15, .38, -.24)
        self.draw_world(frame, bump, (181, 193, 187))
        self.draw_world(frame, bump, (237, 242, 239), 2)
        for x, y in ((2.47, -5.48), (1.48, -4.69), (2.47, -3.90)):
            for k in range(12):
                radius = .59 - .008 * k
                metal = int(226 - 8 * math.cos(k * .47))
                self.lens(frame, x, y, radius, -.27, (metal - 6, metal, metal - 2))
            self.lens(frame, x, y, .47, -.275, (51, 59, 58))
            self.lens(frame, x, y, .40, -.28, (18, 26, 29))
            for k in range(15):
                blend = k / 14
                lens_color = (int(24 + 8 * blend), int(37 + 16 * blend),
                              int(47 + 21 * blend))
                self.lens(frame, x + .05 * blend, y - .08 * blend,
                          .31 - .011 * k, -.285, lens_color)
            self.lens(frame, x + .15, y - .19, .07, -.29, (126, 153, 164))
        self.lens(frame, 1.42, -5.52, .19, -.28, (243, 238, 219))

    def screen(self, canvas: np.ndarray, texture: np.ndarray) -> None:
        self.warp_texture(canvas, texture, self.screen_vertices)
        # Thin glass rim follows the exact projected perimeter. No reflection
        # crosses the app's controls or changes the recorded screen contents.
        self.draw_world(canvas, rounded_points(0, 0, 7.0, 13.31, .43, .226),
                        (91, 101, 97), 1)

    def warp_texture(self, canvas: np.ndarray, texture: np.ndarray,
                     vertices: np.ndarray, mask: np.ndarray | None = None) -> None:
        destinations = self.project(vertices)[0].astype(np.float32)
        # Warp only the visible rectangle, avoiding a full-screen allocation for
        # every homography. The input app image is geometrically projected only.
        left = max(0, math.floor(destinations[:, 0].min()) - 2)
        top = max(0, math.floor(destinations[:, 1].min()) - 2)
        right = min(WIDTH, math.ceil(destinations[:, 0].max()) + 3)
        bottom = min(HEIGHT, math.ceil(destinations[:, 1].max()) + 3)
        if right <= left or bottom <= top:
            return
        h = cv2.getPerspectiveTransform(
            self.texture_vertices, destinations - np.float32((left, top)))
        app = cv2.warpPerspective(texture, h, (right - left, bottom - top),
                                  flags=cv2.INTER_LINEAR)
        alpha = cv2.warpPerspective(self.screen_mask if mask is None else mask, h,
                                    (right - left, bottom - top),
                                    flags=cv2.INTER_LINEAR).astype(np.float32) / 255
        roi = canvas[top:bottom, left:right]
        alpha = alpha[..., None]
        roi[:] = np.clip(app * alpha + roi * (1 - alpha), 0, 255).astype(np.uint8)

    def render(self, t: float, texture: np.ndarray) -> np.ndarray:
        if t >= 34:
            return np.full((HEIGHT, WIDTH, 3), 255, dtype=np.uint8)
        yaw, pitch, roll, scale, self.cx, self.cy = camera(t)
        self.cy -= 60
        self.r = rotation(yaw, pitch, roll)
        self.focal = 1950 * scale
        frame = self.background.copy()
        # Delicate contact shadow grows as the product enters the studio.
        shadow = self.shadow * min(1, scale**2)
        y = 1635
        roi = frame[y:y + 180, 140:940]
        roi[:] = (roi * (1 - shadow[..., None])).astype(np.uint8)
        front, rf = self.project(self.outer_front)
        back, rb = self.project(self.outer_back)
        faces = []
        for i in range(len(front)):
            j = (i + 1) % len(front)
            face = np.asarray((back[i], back[j], front[j], front[i]))
            depth = (rb[i, 2] + rb[j, 2] + rf[j, 2] + rf[i, 2]) / 4
            # Individual slivers catch different parts of the studio softbox.
            angle = i / len(front) * 2 * math.pi
            shine = .62 + .28 * math.cos(angle - math.radians(yaw))
            value = int(121 + 95 * shine)
            faces.append((depth, face, (value - 8, value, value - 3)))
        # Draw the hidden face first; the visible face and the screen are last.
        front_visible = self.r[2, 2] > 0
        polygon(frame, back if front_visible else front, (132, 143, 137))
        for _, face, color in sorted(faces, key=lambda item: item[0]):
            polygon(frame, face, color)
        if front_visible:
            polygon(frame, front, (33, 41, 37))
            polygon(frame, front, (211, 223, 216), 2)
            self.screen(frame, texture)
        else:
            self.back(frame)
        # On the way to the outro the whole product photograph dissolves to
        # white, never to another fictional app state.
        if t > DEMO_END:
            opacity = 1 - ease((t - DEMO_END) / (34 - DEMO_END))
            frame = np.round(frame * opacity + 255 * (1 - opacity)).astype(np.uint8)
        return frame


def prepare_source() -> Path:
    result = OUTPUT / 'actual-app-retimed.avi'
    if not result.exists():
        # Uniform retiming of the genuine capture. fps duplicates real captured
        # frames; it does not interpolate interfaces or synthesize app behavior.
        command = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
                   '-threads', '4', '-i', str(SOURCE / 'source-timed.mp4'),
                   '-vf', f'trim=duration={SOURCE_END},setpts=PTS/{SOURCE_SPEED},'
                   f'fps={FPS},scale={SCREEN_W}:{SCREEN_H}:flags=lanczos',
                   '-an', '-c:v', 'mjpeg', '-q:v', '3', '-threads', '4', str(result)]
        subprocess.run(command, check=True)
    return result


def write_timeline() -> None:
    meta = json.loads((SOURCE / 'capture.json').read_text())
    timeline = {
        'durationSeconds': DURATION, 'width': WIDTH, 'height': HEIGHT, 'fps': FPS,
        'source': str((SOURCE / 'source-timed.mp4').relative_to(ROOT)),
        'capturePassed': meta['passed'],
        'sourceStartSeconds': 0, 'sourceEndSeconds': SOURCE_END,
        'demoStartSeconds': DEMO_START, 'demoEndSeconds': DEMO_END,
        'playbackSpeed': SOURCE_SPEED, 'outroStartSeconds': 34,
        'screenPixelPolicy': 'Geometric projection of verified actual browser frames only; no state injection, interface reconstruction or feature invention.',
        'captionSafeRectangle': [100, 190, 980, 380],
        'phoneCenterYOffsetPixels': -60,
        'projectionFocalPixels': 1950,
        'cameraKeyframes': [dict(zip(('t', 'yaw', 'pitch', 'roll', 'size', 'x', 'y'), row))
                            for row in CAMERA_KEYS],
        'phases': [{**phase,
                    'outputFrom': mapped_time(phase['from']),
                    'outputTo': min(DEMO_END, mapped_time(phase['to']))}
                   for phase in meta['phases'] if phase['from'] < SOURCE_END],
        'taps': [{**tap, 'outputSeconds': mapped_time(tap['relativeSeconds'])}
                 for tap in meta['taps'] if tap['relativeSeconds'] < SOURCE_END],
        'audioClicks': [{**event, 'outputSeconds': mapped_time(event['t'])}
                        for event in meta['audioClicks'] if event['t'] < SOURCE_END],
        'checks': meta['checks'],
    }
    (OUTPUT / 'timeline.json').write_text(json.dumps(timeline, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true', help='Render representative review frames only')
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    cv2.setNumThreads(4)
    write_timeline()
    input_path = prepare_source()
    source = cv2.VideoCapture(str(input_path))
    ok, first = source.read()
    if not ok:
        raise RuntimeError('Cannot decode the verified app capture')
    phone = StudioPhone()
    if args.preview:
        for t in (0.20, .70, .97, 1.40, 2.25, 6.0, 10.0, 18.8, 21.0, 26.5, 31.5, 33.65, 34.0):
            source.set(cv2.CAP_PROP_POS_FRAMES, max(0, round((t - DEMO_START) * FPS)))
            ok, texture = source.read()
            texture = texture if ok and t < DEMO_END else first
            texture = cv2.cvtColor(texture, cv2.COLOR_BGR2RGB)
            frame = phone.render(t, texture)
            cv2.imwrite(str(OUTPUT / f'camera-preview-{t:05.2f}.png'),
                        cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
        print(f'Review frames: {OUTPUT}', flush=True)
        return
    source.set(cv2.CAP_PROP_POS_FRAMES, 0)
    # FFmpeg receives RGB. OpenCV's decoder supplies BGR; no other color or app
    # content manipulation is applied between decode and the projected screen.
    first = cv2.cvtColor(first, cv2.COLOR_BGR2RGB)
    video = OUTPUT / 'phone-camera.tmp.mp4'
    encoder = subprocess.Popen([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning', '-threads', '4',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{HEIGHT}',
        '-r', str(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264',
        '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
        '-profile:v', 'high', '-level', '4.2', '-threads', '4',
        '-movflags', '+faststart', str(video)], stdin=subprocess.PIPE)
    current_index = -1
    texture = first
    try:
        for index in range(FPS * DURATION):
            t = index / FPS
            wanted = max(0, round((min(t, DEMO_END - 1 / FPS) - DEMO_START) * FPS))
            while current_index < wanted:
                ok, decoded = source.read()
                if not ok:
                    break
                current_index += 1
                texture = cv2.cvtColor(decoded, cv2.COLOR_BGR2RGB)
            frame = phone.render(t, texture)
            encoder.stdin.write(frame.tobytes())
            if index % 120 == 0:
                print(f'Camera render {index}/{FPS * DURATION} ({t:.1f}s)', flush=True)
            if index in (67, 180, 564, 630, 945, 1009):
                cv2.imwrite(str(OUTPUT / f'camera-review-{t:05.2f}.png'),
                            cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
    finally:
        encoder.stdin.close()
        source.release()
    if encoder.wait() != 0:
        raise RuntimeError('Phone camera encoder failed')
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
    stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (stream['width'], stream['height']) == (WIDTH, HEIGHT)
    assert stream['nb_frames'] == str(FPS * DURATION)
    assert abs(float(info['format']['duration']) - DURATION) < .01
    target = OUTPUT / 'phone-camera.mp4'
    video.replace(target)
    video = target
    (OUTPUT / 'camera-validation.json').write_text(json.dumps({
        'passed': True, 'durationSeconds': float(info['format']['duration']),
        'frames': int(stream['nb_frames']), 'width': WIDTH, 'height': HEIGHT,
        'appSource': 'verified actual capture', 'playbackSpeed': SOURCE_SPEED,
        'pixelTransform': 'perspective projection only',
        'outputBytes': video.stat().st_size}, indent=2))
    print(f'Validated: {video}', flush=True)


if __name__ == '__main__':
    main()
