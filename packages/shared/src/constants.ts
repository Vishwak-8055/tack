export const BOARD_ROLES = ['owner', 'editor', 'viewer'] as const;
export type BoardRole = (typeof BOARD_ROLES)[number];

export const BOARD_BACKGROUNDS = ['moss', 'navy', 'plum', 'brick', 'slate', 'ochre'] as const;
export type BoardBackground = (typeof BOARD_BACKGROUNDS)[number];

export const LABEL_COLORS = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'teal',
  'pink',
  'gray',
] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

/** Colours every new board starts with, unnamed, so people can name them as they go. */
export const DEFAULT_LABEL_COLORS: readonly LabelColor[] = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
];

export const DEFAULT_LIST_TITLES = ['To do', 'Doing', 'Done'] as const;
