#!/usr/bin/env python3
import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "public" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(
        ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
    )


def write_png(path: pathlib.Path, size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixel(x, y, size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def pixel(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    bg = (28, 29, 31, 255)
    ink = (24, 106, 74, 255)
    node = (232, 234, 236, 255)
    n = size / 16
    # three nodes of a tiny mesh
    centers = [
        (5 * n, 5 * n),
        (11 * n, 5.5 * n),
        (8 * n, 11 * n),
    ]
    radius = 1.6 * n
    stroke = max(1.0, 0.7 * n)
    for i, (ax, ay) in enumerate(centers):
        for bx, by in centers[i + 1 :]:
            if near_segment(x + 0.5, y + 0.5, ax, ay, bx, by, stroke):
                return ink
    for cx, cy in centers:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        if dx * dx + dy * dy <= radius * radius:
            return node
    pad = 1 * n
    if x < pad or y < pad or x >= size - pad or y >= size - pad:
        return ink
    return bg


def near_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float, width: float) -> bool:
    abx, aby = bx - ax, by - ay
    length = (abx * abx + aby * aby) ** 0.5 or 1.0
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / (length * length)))
    qx, qy = ax + t * abx, ay + t * aby
    dx, dy = px - qx, py - qy
    return dx * dx + dy * dy <= (width * 0.5) ** 2


for size in (16, 32, 48, 128):
    write_png(ROOT / f"icon{size}.png", size)
    print("wrote", ROOT / f"icon{size}.png")
