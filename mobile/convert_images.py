import os
import struct

dir_path = r'd:\codes\MERN\medico\mobile\assets\images'

failed_files = [
    'd8ad60edd50d15bfa3472e8a2d9ca46b49e1d6b3.png',
    '8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png',
    '79c15725f6f1a73658b615886f1289634cef9408.png',
    '86bc70fa8f71d21216a24037fe0a8390c6f29516.png',
    '54f5c849cf75e776592dec8236f221da3694ca53.png',
    '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png'
]

# First, analyze all .png files
png_files = [f for f in os.listdir(dir_path) if f.endswith('.png')]
webp_list = []
non_png_list = []

for f in png_files:
    fp = os.path.join(dir_path, f)
    with open(fp, 'rb') as fh:
        header = fh.read(12)
    
    is_png = header[:4] == b'\x89PNG'
    is_webp = header[:4] == b'RIFF' and header[8:12] == b'WEBP'
    is_jpeg = header[:3] == b'\xff\xd8\xff'
    
    if is_webp:
        webp_list.append(f)
    elif is_jpeg:
        non_png_list.append((f, 'JPEG'))
    elif not is_png:
        non_png_list.append((f, 'Unknown: ' + header[:8].hex()))

print(f'Total .png files: {len(png_files)}')
print(f'Actually WebP: {len(webp_list)}')
print(f'Other non-PNG: {len(non_png_list)}')
print()

print('=== Failed files analysis ===')
for f in failed_files:
    fp = os.path.join(dir_path, f)
    with open(fp, 'rb') as fh:
        header = fh.read(12)
    is_png = header[:4] == b'\x89PNG'
    is_webp = header[:4] == b'RIFF' and header[8:12] == b'WEBP'
    is_jpeg = header[:3] == b'\xff\xd8\xff'
    t = 'PNG' if is_png else 'WebP' if is_webp else 'JPEG' if is_jpeg else 'Unknown'
    sz = os.path.getsize(fp)
    print(f'  {f} -> {t} ({sz} bytes)')

if webp_list:
    print(f'\n=== WebP files disguised as PNG ({len(webp_list)}) ===')
    for f in webp_list:
        print(f'  {f}')

if non_png_list:
    print(f'\n=== Other non-PNG files ({len(non_png_list)}) ===')
    for f, t in non_png_list:
        print(f'  {f} -> {t}')

# Now convert using Pillow
print('\n=== Converting non-PNG files to actual PNG ===')
try:
    from PIL import Image
    all_to_convert = webp_list + [f for f, _ in non_png_list]
    converted = 0
    for f in all_to_convert:
        fp = os.path.join(dir_path, f)
        try:
            img = Image.open(fp)
            img.save(fp, 'PNG')
            converted += 1
            print(f'  Converted: {f}')
        except Exception as e:
            print(f'  FAILED: {f} - {e}')
    print(f'\nDone! Converted {converted} files.')
except ImportError:
    print('Pillow not installed. Run: pip install Pillow')
