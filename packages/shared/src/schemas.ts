import { z } from 'zod';
import { BOARD_BACKGROUNDS, LABEL_COLORS } from './constants';

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} can't be empty`)
    .max(max, `${label} must be ${max} characters or fewer`);

const uuid = z.string().uuid();
const hasKeys = (value: object) => Object.keys(value).length > 0;
const nothingToUpdate = { message: 'Nothing to update' };

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use 128 characters or fewer');

export const registerSchema = z.object({
  name: text(80, 'Name'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const updateProfileSchema = z.object({ name: text(80, 'Name') });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: passwordSchema,
});

export const createBoardSchema = z.object({
  title: text(100, 'Title'),
  background: z.enum(BOARD_BACKGROUNDS).default('moss'),
  template: z.enum(['kanban', 'blank']).default('kanban'),
});

export const updateBoardSchema = z
  .object({
    title: text(100, 'Title').optional(),
    background: z.enum(BOARD_BACKGROUNDS).optional(),
  })
  .refine(hasKeys, nothingToUpdate);

export const starBoardSchema = z.object({ starred: z.boolean() });

export const addMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['editor', 'viewer']).default('editor'),
});

export const updateMemberSchema = z.object({ role: z.enum(['editor', 'viewer']) });

export const createLabelSchema = z.object({
  name: z.string().trim().max(40, 'Label names are 40 characters or fewer').default(''),
  color: z.enum(LABEL_COLORS),
});

export const updateLabelSchema = z
  .object({
    name: z.string().trim().max(40, 'Label names are 40 characters or fewer').optional(),
    color: z.enum(LABEL_COLORS).optional(),
  })
  .refine(hasKeys, nothingToUpdate);

export const createListSchema = z.object({ title: text(100, 'Title') });
export const updateListSchema = z.object({ title: text(100, 'Title') });
export const moveListSchema = z.object({ afterId: uuid.nullable() });

export const createCardSchema = z.object({ title: text(300, 'Title') });

export const updateCardSchema = z
  .object({
    title: text(300, 'Title').optional(),
    description: z.string().max(20_000, 'Description is too long').optional(),
    dueAt: z.iso.datetime().nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine(hasKeys, nothingToUpdate);

export const moveCardSchema = z.object({ listId: uuid, afterId: uuid.nullable() });

export const createChecklistItemSchema = z.object({ text: text(300, 'Item') });

export const updateChecklistItemSchema = z
  .object({
    text: text(300, 'Item').optional(),
    done: z.boolean().optional(),
  })
  .refine(hasKeys, nothingToUpdate);

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(5000, 'Comment is too long'),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type CreateBoardInput = z.input<typeof createBoardSchema>;
export type UpdateCardInput = z.input<typeof updateCardSchema>;

export type RegisterData = z.output<typeof registerSchema>;
export type LoginData = z.output<typeof loginSchema>;
export type UpdateProfileData = z.output<typeof updateProfileSchema>;
export type ChangePasswordData = z.output<typeof changePasswordSchema>;
export type CreateBoardData = z.output<typeof createBoardSchema>;
export type UpdateBoardData = z.output<typeof updateBoardSchema>;
export type AddMemberData = z.output<typeof addMemberSchema>;
export type CreateLabelData = z.output<typeof createLabelSchema>;
export type UpdateLabelData = z.output<typeof updateLabelSchema>;
export type CreateListData = z.output<typeof createListSchema>;
export type MoveListData = z.output<typeof moveListSchema>;
export type CreateCardData = z.output<typeof createCardSchema>;
export type UpdateCardData = z.output<typeof updateCardSchema>;
export type MoveCardData = z.output<typeof moveCardSchema>;
export type CreateChecklistItemData = z.output<typeof createChecklistItemSchema>;
export type UpdateChecklistItemData = z.output<typeof updateChecklistItemSchema>;
export type CommentData = z.output<typeof commentSchema>;
