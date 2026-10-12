"""Compose actual captured app video, original music, and logged app click audio."""
from pathlib import Path
import array
import json
import math
import subprocess
import wave

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
folder = root / 'artifacts/reel'
meta = json.loads((folder / 'capture.json').read_text())
start = max(0, meta['rawStartOffsetSeconds'])
# Decorative canvas/mask only. The app imagery and operations come from raw.webm.
background = Image.new('RGB', (1080, 1920))
pixels = background.load()
for y in range(1920):
    ratio = y / 1919
    color = tuple(round(a + (b-a)*ratio) for a,b in zip((239,242,230),(249,246,237)))
    for x in range(1080): pixels[x,y] = color
pen=ImageDraw.Draw(background)
pen.rounded_rectangle((114,206,966,1798),radius=48,fill=(216,224,204))
pen.rounded_rectangle((119,211,961,1793),radius=44,fill=(35,62,52))
pen.rounded_rectangle((455,190,625,205),radius=7,fill=(233,126,83))
background.save(folder/'background.png')
mask=Image.new('L',(820,1564));ImageDraw.Draw(mask).rounded_rectangle((0,0,819,1563),radius=34,fill=255);mask.save(folder/'mask.png')
scenes=[
 (0,4,'여행 전에, 한마디부터.','루모와 준비하는 일본 여행'),
 (4,11,'나의 여행, 나의 학습 일정','오사카 · 14일 · 1~30일 선택'),
 (11,17,'여행에서 만날 순간을 미리 연습','예제 커리큘럼을 검토하고 체험해요'),
 (17,22,'한 문제씩, 천천히','식당에서 “두 명이에요” 말해 보기'),
 (22,27,'루모의 피드백으로 한 번 더','二人です。 · 후타리 데스'),
 (27,33,'배운 표현은 복습 노트에','첫 시도를 남기고 다시 연습해요'),
 (33,38,'필요한 순간, 꺼내 쓰는 한마디','상황별 예제 표현 · 즐겨찾기'),
 (38,40,'1 Month Trip','여행을 위한 작은 배움'),
]
# Same 60ms waveform as the app, at actual AudioBufferSourceNode.start moments.
rate=48000; duration=40; samples=array.array('h',[0])*(rate*duration*2)
for event in meta['audioClicks']:
    timestamp=event['t']
    for i in range(math.ceil(.06*rate)):
        at=int(round(timestamp*rate))+i
        if not 0<=at<rate*duration:continue
        t=i/rate
        envelope=min(t/.003,1)*(1-t/.06)**2
        value=round(32767*.1*envelope*(math.sin(2*math.pi*1046.5*t)+.18*math.sin(2*math.pi*1568*t)))
        for channel in range(2): samples[at*2+channel]=max(-32768,min(32767,samples[at*2+channel]+value))
with wave.open(str(folder/'clicks.wav'),'wb') as output:
    output.setparams((2,2,rate,rate*duration,'NONE','not compressed'));output.writeframes(samples.tobytes())
font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
regular='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
filters=[f'[0:v]trim=start={start}:duration=40,setpts=PTS-STARTPTS,fps=30,scale=820:1564:flags=lanczos,format=rgba[app]',
 '[2:v]format=gray[mask]', '[app][mask]alphamerge[rounded]', '[1:v][rounded]overlay=x=130:y=220:shortest=1[base]']
labels=[]
for index,(begin,end,title,subtitle) in enumerate(scenes):
    titlefile=folder/f'title-{index}.txt';titlefile.write_text(title)
    subtitlefile=folder/f'subtitle-{index}.txt';subtitlefile.write_text(subtitle)
    alpha=f"min(1,(t-{begin})/0.22)*min(1,({end}-t)/0.18)"
    labels.extend([f"drawtext=fontfile={font}:textfile={titlefile}:fontcolor=0x233E34:fontsize=48:x=(w-tw)/2:y=74:alpha='{alpha}':enable='between(t,{begin},{end})'",
        f"drawtext=fontfile={regular}:textfile={subtitlefile}:fontcolor=0x315C46:fontsize=34:x=(w-tw)/2:y=1816:alpha='{alpha}':enable='between(t,{begin},{end})'"])
labels.extend([f"drawtext=fontfile={regular}:text='개발 미리보기 · 실제 웹 화면 녹화':fontcolor=0x6C7861:fontsize=23:x=(w-tw)/2:y=147",
 "drawbox=x=130:y=1891:w=820:h=4:color=0xD6DEC9:t=fill", "drawbox=x=130:y=1891:w=180:h=4:color=0xE97E53:t=fill"])
filters.append('[base]'+','.join(labels)+'[video]')
filters.extend(['[3:a]volume=1.6[music]', '[4:a]volume=1.15[clicks]', '[music][clicks]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=9,afade=t=out:st=39.2:d=0.8[audio]'])
filterfile=folder/'filters.ffmpeg';filterfile.write_text(';\n'.join(filters))
output=folder/'1MonthTrip-Reel-1080x1920-40s.mp4'
command=['ffmpeg','-y','-hide_banner','-loglevel','warning','-threads','4','-i',str(folder/'raw.webm'),'-loop','1','-i',str(folder/'background.png'),'-loop','1','-i',str(folder/'mask.png'),'-i',str(folder/'music.wav'),'-i',str(folder/'clicks.wav'),'-filter_complex_threads','4','-filter_complex_script',str(filterfile),'-map','[video]','-map','[audio]','-t','40','-r','30','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level','4.2','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(output)]
subprocess.run(command,check=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
video=next(s for s in info['streams'] if s['codec_type']=='video');audio=next(s for s in info['streams'] if s['codec_type']=='audio')
assert (video['width'],video['height'])==(1080,1920)
assert abs(float(info['format']['duration'])-40)<.04
assert video['nb_frames']=='1200'
assert audio['sample_rate']=='48000' and audio['channels']==2
(folder/'video-validation.json').write_text(json.dumps({'passed':True,'width':1080,'height':1920,'duration_seconds':float(info['format']['duration']),'fps':video['avg_frame_rate'],'frames':video['nb_frames'],'video_codec':video['codec_name'],'audio_codec':audio['codec_name'],'sample_rate':48000,'channels':2,'bytes':output.stat().st_size,'capture_steps':meta['steps'],'click_count':len(meta['audioClicks']),'music':'original synthesized instrumental','app_behavior':'Actual Playwright browser interactions; no program state injection'},ensure_ascii=False,indent=2))
srt=[]
for index,(begin,end,title,subtitle) in enumerate(scenes,1):
    def stamp(seconds):return f'00:00:{seconds:02d},000'
    srt.append(f'{index}\n{stamp(begin)} --> {stamp(end)}\n{title}\n{subtitle}\n')
(folder/'1MonthTrip-Reel.ko.srt').write_text('\n'.join(srt))
print(f'Validated 1080x1920 / 40s / 1200 frames / stereo AAC: {output.stat().st_size} bytes')
