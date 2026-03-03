import urllib.request
import os

fonts = [
    "Poppins-Regular.ttf",
    "Poppins-Medium.ttf",
    "Poppins-SemiBold.ttf",
    "Poppins-Bold.ttf",
    "Poppins-Light.ttf"
]

base_url = "https://github.com/google/fonts/raw/main/ofl/poppins/"
output_dir = "assets/fonts"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for font in fonts:
    url = base_url + font
    dest = os.path.join(output_dir, font)
    print(f"Downloading {url} to {dest}...")
    try:
        urllib.request.urlretrieve(url, dest)
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
