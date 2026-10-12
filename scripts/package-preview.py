"""Create a self-contained preview from Expo's verified web export."""
from pathlib import Path
import base64
import mimetypes
import re

root = Path(__file__).resolve().parents[1]
dist = root / 'apps/mobile/dist'
html = (dist / 'index.html').read_text().replace('lang="en"', 'lang="ko"')
script_path = re.search(r'<script src="([^"]+)" defer></script>', html).group(1)
bundle = (dist / script_path.lstrip('/')).read_text()
count = 0
for asset in (dist / 'assets').rglob('*'):
    if not asset.is_file():
        continue
    url = '/' + asset.relative_to(dist).as_posix()
    if url in bundle:
        mime = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
        uri = f'data:{mime};base64,' + base64.b64encode(asset.read_bytes()).decode()
        bundle = bundle.replace(url, uri)
        count += 1
bundle = bundle.replace('</script', '<\\/script')
html = re.sub(r'<script src="[^"]+" defer></script>', lambda _: '<script>' + bundle + '</script>', html)
output = root / 'artifacts/1MonthTrip-iOS-preview.html'
output.write_text(html)
print(f'Standalone preview: {count} embedded assets; {output.stat().st_size} bytes')
