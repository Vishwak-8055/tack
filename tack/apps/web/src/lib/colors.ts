import type { BoardBackground, LabelColor } from '@tack/shared';

/** Marker colours, chosen so white (or ink, for the light ones) text stays readable on top. */
export const LABEL_STYLES: Record<LabelColor, { bg: string; fg: string }> = {
  green: { bg: '#1f7a4a', fg: '#ffffff' },
  yellow: { bg: '#ffd23f', fg: '#14202b' },
  orange: { bg: '#f29d38', fg: '#14202b' },
  red: { bg: '#c8362d', fg: '#ffffff' },
  purple: { bg: '#6b4fc4', fg: '#ffffff' },
  blue: { bg: '#2563c9', fg: '#ffffff' },
  teal: { bg: '#14808c', fg: '#ffffff' },
  pink: { bg: '#c93a83', fg: '#ffffff' },
  gray: { bg: '#5e6d7c', fg: '#ffffff' },
};

export const BOARD_STYLES: Record<BoardBackground, { name: string; color: string }> = {
  moss: { name: 'Moss', color: '#2c5b4e' },
  navy: { name: 'Navy', color: '#24406b' },
  plum: { name: 'Plum', color: '#58355f' },
  brick: { name: 'Brick', color: '#8c3f35' },
  slate: { name: 'Slate', color: '#3d4b5a' },
  ochre: { name: 'Ochre', color: '#8a6419' },
};

/** The same person always gets the same colour, without storing one. */
export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 42% 34%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts.at(-1)![0]! : '';
  return (first + last).toUpperCase();
}
