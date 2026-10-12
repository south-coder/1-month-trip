"""Rebuild exact-timed footage from the untouched browser screencast JPEGs."""
from pathlib import Path
import bisect
import math
import re
import subprocess

import cv2

root=Path(__file__).resolve().parents[1]
folder=root/'artifacts/reel'
text=(folder/'capture-frames.ffconcat').read_text()
files=[Path(p) for p in re.findall(r"file '([^']+)'",text)]
durations=[float(d) for d in re.findall(r'^duration ([\d.]+)',text,re.M)]
files=files[:len(durations)]
assert len(files)==len(durations)
images=[cv2.imread(str(p)) for p in files]
assert all(im is not None and im.shape[:2]==(1640,860) for im in images)
starts=[]; elapsed=0
for duration in durations:starts.append(elapsed);elapsed+=duration
frames=math.ceil(elapsed*30)
target=folder/'source-timed.tmp.mp4'
cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s','860x1640','-r','30','-i','-','-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','15','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
process=subprocess.Popen(cmd,stdin=subprocess.PIPE)
try:
 for frame in range(frames):
  index=max(0,min(len(images)-1,bisect.bisect_right(starts,frame/30)-1))
  process.stdin.write(images[index].tobytes())
finally:process.stdin.close()
assert process.wait()==0
target.rename(folder/'source-timed.mp4')
print(f'Exact observed browser JPEG timing rebuilt: {frames} frames / {frames/30:.3f}s')
