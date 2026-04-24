"""Generate icons/icon16.png, icon48.png, icon128.png using stdlib only."""
import struct, zlib, os

def make_png(width, height, bg=(20, 20, 30), dot=(99, 102, 241)):
    """Create a minimal solid-color PNG with an accent dot."""
    def chunk(tag, data):
        payload = tag + data
        return (struct.pack('>I', len(data)) + payload +
                struct.pack('>I', zlib.crc32(payload) & 0xFFFFFFFF))

    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    # Draw a simple icon: dark background with a coloured circle
    cx, cy, r = width // 2, height // 2, max(width // 3, 2)
    rows = []
    for y in range(height):
        row = b'\x00'  # filter byte
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist <= r:
                # inner bright ring
                if dist >= r - max(r * 0.25, 1):
                    row += bytes(dot)
                else:
                    # dark centre
                    row += bytes([c // 3 for c in dot])
            else:
                row += bytes(bg)
        rows.append(row)

    raw = b''.join(rows)
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')

    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


os.makedirs('icons', exist_ok=True)
for size in [16, 48, 128]:
    data = make_png(size, size)
    path = f'icons/icon{size}.png'
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Created {path}  ({size}x{size}, {len(data)} bytes)')

print('\nDone! Icons are ready in the icons/ folder.')
