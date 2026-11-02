# Uso: python sin_fondo.py entrada salida.png  → PNG con fondo transparente, recortado al contenido.
import sys
from PIL import Image
from rembg import remove, new_session
im = Image.open(sys.argv[1]).convert('RGB')
out = remove(im, session=new_session('isnet-general-use'))
bb = out.getbbox()
if bb: out = out.crop(bb)
out.save(sys.argv[2])
print(out.size[0], out.size[1])
