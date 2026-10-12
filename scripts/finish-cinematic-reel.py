"""Add top-safe explanations and a mascot-only brand outro to true app footage."""
from pathlib import Path
import json
import math
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

root=Path(__file__).resolve().parents[1]
folder=root/'artifacts/reel-v2'
base=root/'artifacts/reel-cinematic/phone-camera.mp4'
WIDTH,HEIGHT,FPS,DURATION=1080,1920,30,40
capture=cv2.VideoCapture(str(base))
assert capture.isOpened()
assert int(capture.get(cv2.CAP_PROP_FRAME_COUNT))==1200
sprite_path=folder/'rumo-sprites.png'
if not sprite_path.exists():sprite_path=root/'media/cinematic-assets/rumo-sprites.png'
sheet=Image.open(sprite_path).convert('RGBA')
rgba=np.asarray(sheet)
count,labels,stats,centers=cv2.connectedComponentsWithStats((rgba[:,:,3]>120).astype(np.uint8),8)
objects=sorted(range(1,count),key=lambda i:stats[i,4],reverse=True)[:9]
# Technical sprite extraction/registration from the generated animation sheet.
# Preserve the original asset; isolate its nine separate transparent cutouts.
objects.sort(key=lambda i:(int(centers[i,1]//450),centers[i,0]))
actors=[];hats=[]
for index,component in enumerate(objects):
 x,y,w,h,area=stats[component]
 sprite=sheet.crop((x,y,x+w,y+h))
 sprite_array=np.array(sprite)
 # Ignore unrelated floating alpha islands from the sheet outside this cutout.
 owned=(labels[y:y+h,x:x+w]==component).astype(np.uint8)*255
 owned=cv2.dilate(owned,np.ones((3,3),np.uint8),iterations=1)
 sprite_array[:,:,3]=np.minimum(sprite_array[:,:,3],owned)
 sprite=Image.fromarray(sprite_array)
 if index<6:
  sprite=sprite.resize((round(w*.82),round(h*.82)),Image.Resampling.LANCZOS);actors.append(sprite)
 else:
  sprite=sprite.resize((round(w*.50),round(h*.50)),Image.Resampling.LANCZOS);hats.append(sprite)
fontpath='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
regularpath='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
heading=ImageFont.truetype(fontpath,52)
subheading=ImageFont.truetype(regularpath,32)
tagfont=ImageFont.truetype(regularpath,21)
wordfont=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',82)
def ease(value):
 value=max(0,min(1,value));return value*value*(3-2*value)
def mapped(source):return 1.8+source*31.45/38
scenes=[
 (.35,mapped(4),'여행 전에, 한마디부터.','루모와 준비하는 일본어'),
 (mapped(4),mapped(11),'나의 여행부터 설정해요','오사카 · 14일 학습'),
 (mapped(11),mapped(17),'여행 속 순간을 미리 연습','예제 학습 지도를 검토해요'),
 (mapped(17),mapped(22),'한 문제씩, 가볍게','식당에서 “두 명이에요”'),
 (mapped(22),mapped(27),'루모와 한 번 더','二人です。 · 후타리 데스'),
 (mapped(27),mapped(33),'배운 한마디를 다시 만나요','첫 시도를 복습 노트에'),
 (mapped(33),33.25,'필요한 말은 가방에 쏙','예제 표현을 저장해요'),
]
text_layer_bounds=[]
def centered(layer,text,font,y,color,opacity=1):
 draw=ImageDraw.Draw(layer);bbox=draw.textbbox((0,0),text,font=font)
 width=bbox[2]-bbox[0]
 draw.text(((WIDTH-width)/2-bbox[0],y-bbox[1]),text,font=font,fill=(*color,round(255*opacity)))
 return [(WIDTH-width)/2,y,(WIDTH+width)/2,y+bbox[3]-bbox[1]]
output=folder/'1MonthTrip-Cinematic-Reel-1080x1920-40s.mp4'
cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','30','-i','-','-i',str(folder/'audio.wav'),'-map','0:v:0','-map','1:a:0','-t','40','-c:v','libx264','-threads','4','-preset','medium','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level','4.2','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(output)]
encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE)
try:
 for frame in range(1200):
  success,bgr=capture.read();assert success
  t=frame/FPS
  image=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)).convert('RGBA')
  if t<33.25:
   overlay=Image.new('RGBA',(WIDTH,HEIGHT))
   for begin,end,title,subtitle in scenes:
    if begin<=t<end:
     opacity=ease((t-begin)/.25)*ease((end-t)/.18)
     centered(overlay,title,heading,235,(34,54,45),opacity)
     centered(overlay,subtitle,subheading,317,(102,117,102),opacity)
     if abs(t-(begin+.4))<1/FPS:text_layer_bounds.append({'title':title,'y':235,'subtitleY':317})
   centered(overlay,'실제 웹 화면 · 개발 미리보기',tagfont,180,(127,137,123),min(1,t/.5))
   image=Image.alpha_composite(image,overlay)
  if t>=34:
   image=Image.new('RGBA',(WIDTH,HEIGHT),(255,255,255,255))
   # Centered brand signature; no caption or CTA competing with the chase.
   logo_alpha=ease((t-35.45)/1.15)
   overlay=Image.new('RGBA',(WIDTH,HEIGHT));draw=ImageDraw.Draw(overlay)
   word='1 Month Trip';bbox=draw.textbbox((0,0),word,font=wordfont)
   textheight=bbox[3]-bbox[1]
   centered(overlay,word,wordfont,(HEIGHT-textheight)/2,(36,54,45),logo_alpha)
   image=Image.alpha_composite(image,overlay)
   if 34.6<=t<39.2:
    phase=max(0,t-35.0)
    progress=max(0,min(1,phase/3.4))
    x=-350+1000*progress
    if t>=38.4:x=650+500*ease((t-38.4)/.8)
    actor=actors[int(phase*12)%6]
    bounce=7*math.sin(phase*math.pi*14)
    actor_y=1390-actor.height-bounce
    if t>=35.0:
     shadow=Image.new('RGBA',(WIDTH,HEIGHT));sd=ImageDraw.Draw(shadow)
     sd.ellipse((x+40,1384,x+actor.width-10,1405),fill=(90,90,70,24))
     shadow=shadow.filter(ImageFilter.GaussianBlur(7));image=Image.alpha_composite(image,shadow)
     image.alpha_composite(actor,(round(x),round(actor_y)))
    # Airborne hat maintains a clear lead, then meets the outstretched claw.
    hat=hats[int((t-34.6)*4)%3]
    hat_x=x+330+180
    if t<35:hat_x=80+(t-34.6)*200
    hat_y=1120+38*math.sin((t-34.6)*2.8)
    if t>37.8:
     approach=ease((t-37.8)/.6)
     hat_x=(1-approach)*hat_x+approach*(x+actor.width-38)
     hat_y=(1-approach)*hat_y+approach*(actor_y+115)
    if t>=38.4:hat_x=x+actor.width-38;hat_y=actor_y+115
    angle=18*math.sin((t-34.6)*5.2)
    if t>=38.4:angle=-12
    flying=hat.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    image.alpha_composite(flying,(round(hat_x-flying.width/2),round(hat_y)))
  if frame in (21,69,575,1005,1080,1130,1190):
   image.convert('RGB').save(folder/f'cinematic-check-{frame:04d}.png')
  encoder.stdin.write(image.convert('RGB').tobytes())
  if frame%300==0:print(f'Compositing {frame}/1200',flush=True)
finally:
 encoder.stdin.close();capture.release()
assert encoder.wait()==0
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['nb_frames'])==(1080,1920,'1200')
assert abs(float(info['format']['duration'])-40)<.02
assert a['channels']==2 and a['sample_rate']=='48000'
report={'passed':True,'width':1080,'height':1920,'duration':40.0,'fps':'30/1','frames':1200,'bytes':output.stat().st_size,'actualAppFootage':True,'sourceTiming':'observed CDP JPEG durations; source0–38 mapped1.8–33.25','captionPositions':{'tagY':180,'headingY':235,'subtitleY':317,'lowerCaptions':False},'outro':{'whiteStart':34,'wordmark':'1 Month Trip','wordmarkCenter':[540,960],'fadeStart':35.45,'fadeEnd':36.6,'runStart':35,'catch':38.4,'exitEnd':39.2,'generatedRunCycleFrames':6,'hatFrames':3},'videoCodec':v['codec_name'],'audioCodec':a['codec_name']}
(folder/'cinematic-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
srt=[]
def stamp(seconds):
 ms=round(seconds*1000);return f'00:00:{ms//1000:02d},{ms%1000:03d}'
for i,(begin,end,title,subtitle) in enumerate(scenes,1):srt.append(f'{i}\n{stamp(begin)} --> {stamp(end)}\n{title}\n{subtitle}\n')
(folder/'1MonthTrip-Cinematic-Reel.ko.srt').write_text('\n'.join(srt))
print(json.dumps(report,ensure_ascii=False))
