from __future__ import annotations

from pathlib import Path
import math
import struct
import zlib

OUT_DIR = Path('/opt/data/gurken-retter-github-pages/apfelmaennchen/icons')
SIZES = [180, 192, 512]


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    return (
        struct.pack('>I', len(data))
        + chunk_type
        + data
        + struct.pack('>I', zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    )


def write_png(path: Path, width: int, height: int, rows: list[bytes]) -> None:
    raw = b''.join(b'\x00' + row for row in rows)
    png = b'\x89PNG\r\n\x1a\n'
    png += png_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    png += png_chunk(b'IDAT', zlib.compress(raw, level=9))
    png += png_chunk(b'IEND', b'')
    path.write_bytes(png)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def palette(t: float) -> tuple[int, int, int]:
    stops = [
        (0.00, (6, 10, 24)),
        (0.20, (18, 35, 88)),
        (0.45, (42, 109, 190)),
        (0.68, (126, 214, 255)),
        (0.84, (255, 212, 108)),
        (1.00, (255, 137, 92)),
    ]
    for (p1, c1), (p2, c2) in zip(stops, stops[1:]):
        if t <= p2:
            local = 0 if p2 == p1 else (t - p1) / (p2 - p1)
            return mix(c1, c2, max(0.0, min(1.0, local)))
    return stops[-1][1]


def mandelbrot_escape(cr: float, ci: float, max_iter: int) -> int:
    zr = 0.0
    zi = 0.0
    for i in range(max_iter):
        zr2 = zr * zr - zi * zi + cr
        zi = 2.0 * zr * zi + ci
        zr = zr2
        if zr * zr + zi * zi > 4.0:
            return i
    return max_iter


def render_icon(size: int) -> list[bytes]:
    rows: list[bytes] = []
    max_iter = 90 if size < 256 else 120
    bg_top = (8, 17, 36)
    bg_bottom = (2, 5, 12)
    glow = (124, 214, 255)

    for y in range(size):
        row = bytearray()
        yn = y / (size - 1)
        for x in range(size):
            xn = x / (size - 1)
            # Background gradient + radial glow
            r, g, b = mix(bg_top, bg_bottom, yn)
            dx = xn - 0.52
            dy = yn - 0.45
            halo = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) / 0.72)
            r = int(min(255, r + glow[0] * halo * 0.10))
            g = int(min(255, g + glow[1] * halo * 0.08))
            b = int(min(255, b + glow[2] * halo * 0.18))

            # Inner rounded-square window
            margin = 0.12
            inside = margin <= xn <= 1 - margin and margin <= yn <= 1 - margin
            if inside:
                # normalized coordinate space for the set
                cr = -2.20 + ((xn - margin) / (1 - 2 * margin)) * 3.20
                ci = 1.20 - ((yn - margin) / (1 - 2 * margin)) * 2.40
                it = mandelbrot_escape(cr, ci, max_iter)

                # soft rounded mask
                rx = min((xn - margin), (1 - margin - xn)) / margin
                ry = min((yn - margin), (1 - margin - yn)) / margin
                edge_soft = max(0.0, min(1.0, min(rx, ry) * 2.5))

                if it >= max_iter:
                    set_col = (7, 8, 16)
                else:
                    t = math.sqrt(it / max_iter)
                    set_col = palette(t)

                r = int(r * (1 - edge_soft) + set_col[0] * edge_soft)
                g = int(g * (1 - edge_soft) + set_col[1] * edge_soft)
                b = int(b * (1 - edge_soft) + set_col[2] * edge_soft)

                # golden orbit-like highlight ring near window edge
                border = min(
                    (xn - margin), (1 - margin - xn),
                    (yn - margin), (1 - margin - yn)
                )
                if 0.0 < border < 0.008:
                    k = 1.0 - border / 0.008
                    r = int(min(255, lerp(r, 255, 0.35 * k)))
                    g = int(min(255, lerp(g, 220, 0.35 * k)))
                    b = int(min(255, lerp(b, 130, 0.22 * k)))

            # subtle outer star spark
            sx = 0.82
            sy = 0.18
            spark = max(0.0, 1.0 - math.hypot(xn - sx, yn - sy) / 0.055)
            if spark > 0:
                spark *= spark
                r = int(min(255, r + 180 * spark))
                g = int(min(255, g + 160 * spark))
                b = int(min(255, b + 110 * spark))

            row.extend((r, g, b))
        rows.append(bytes(row))
    return rows


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f'icon-{size}.png'
        write_png(path, size, size, render_icon(size))
        print(path)


if __name__ == '__main__':
    main()
