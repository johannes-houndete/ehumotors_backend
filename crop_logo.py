import fitz
from PIL import Image, ImageChops
import io

pdf_path = "frontend/logo ehumotors(1).pdf"
output_path = "frontend/public/logo.png"

doc = fitz.open(pdf_path)
page = doc[0]

# Render at high zoom with transparency
zoom = 6  # ~432 DPI for crisp logo
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat, alpha=True)
doc.close()

# Convert to PIL
img_bytes = pix.tobytes("png")
img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

# Auto-crop: find bounding box of non-transparent, non-white pixels
r, g, b, a = img.split()

# Create a mask of non-white AND non-transparent pixels
from PIL import ImageFilter
import numpy as np

arr = __import__('numpy').array(img)
# Find rows and cols where content exists (not white/transparent)
alpha = arr[:, :, 3]
rgb = arr[:, :, :3]

# Pixels that are non-transparent and not close to white
non_empty = (alpha > 30) & ~((rgb[:, :, 0] > 240) & (rgb[:, :, 1] > 240) & (rgb[:, :, 2] > 240))

rows = __import__('numpy').any(non_empty, axis=1)
cols = __import__('numpy').any(non_empty, axis=0)

rmin, rmax = __import__('numpy').where(rows)[0][[0, -1]]
cmin, cmax = __import__('numpy').where(cols)[0][[0, -1]]

# Add small padding
pad = 40
rmin = max(0, rmin - pad)
rmax = min(img.height, rmax + pad)
cmin = max(0, cmin - pad)
cmax = min(img.width, cmax + pad)

cropped = img.crop((cmin, rmin, cmax, rmax))
print(f"Original size: {img.width}x{img.height}")
print(f"Cropped size: {cropped.width}x{cropped.height}")

cropped.save(output_path, "PNG")
print(f"Logo saved: {output_path}")
