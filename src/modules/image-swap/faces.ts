import { DEFAULT_PACK_ID } from '../../core/constants'
import type { ImagePack } from '../../core/types'

type Face = {
  bg: string
  skin: string
  ink: string
  eye: [number, number, number, number]
  mouth: string
}

const FACES: Face[] = [
  {
    bg: '#1b6b4a',
    skin: '#f3e0b5',
    ink: '#191919',
    eye: [38, 50, 14, 16],
    mouth: 'M42 86 Q64 104 86 86',
  },
  {
    bg: '#2c3a8c',
    skin: '#e7c4a8',
    ink: '#111318',
    eye: [40, 46, 10, 22],
    mouth: 'M48 90 Q64 78 80 90',
  },
  {
    bg: '#8a2f1d',
    skin: '#f0d5a6',
    ink: '#20140f',
    eye: [36, 52, 18, 10],
    mouth: 'M40 82 L88 92',
  },
  {
    bg: '#5b3a8c',
    skin: '#f6e7c1',
    ink: '#1a1224',
    eye: [42, 48, 8, 18],
    mouth: 'M46 88 Q64 98 82 88',
  },
  {
    bg: '#1d4f6e',
    skin: '#ddb48c',
    ink: '#0e1a22',
    eye: [34, 44, 16, 16],
    mouth: 'M50 92 Q64 84 78 92',
  },
  {
    bg: '#6a6f1f',
    skin: '#f4d7b0',
    ink: '#1c1d12',
    eye: [40, 54, 12, 8],
    mouth: 'M44 80 Q64 110 84 80',
  },
]

function svgFace(face: Face, index: number): string {
  const [ex, ey, ew, eh] = face.eye
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
<rect width="128" height="128" fill="${face.bg}"/>
<circle cx="64" cy="58" r="42" fill="${face.skin}"/>
<rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" fill="${face.ink}"/>
<rect x="${128 - ex - ew}" y="${ey}" width="${ew}" height="${eh}" fill="${face.ink}"/>
<path d="${face.mouth}" fill="none" stroke="${face.ink}" stroke-width="5" stroke-linecap="round"/>
<text x="64" y="122" text-anchor="middle" font-size="10" fill="${face.skin}" font-family="sans-serif">${index + 1}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function builtinPack(): ImagePack {
  return {
    id: DEFAULT_PACK_ID,
    name: 'Caras padrão',
    author: 'muvuca',
    imageCount: FACES.length,
    createdAt: 0,
    source: 'builtin',
    images: FACES.map(svgFace),
  }
}
