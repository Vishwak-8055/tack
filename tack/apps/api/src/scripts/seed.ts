/**
 * Creates three demo accounts and a few populated boards, using the same services the API uses.
 * Safe to run twice: it does nothing if the demo user already exists.
 *
 *   demo@tack.dev   (owner of the main board)
 *   priya@tack.dev  (editor)
 *   sam@tack.dev    (viewer)
 *
 * All three use the password below.
 */
import type { Ctx } from '../lib/context';
import { migrate } from '../db/migrate';
import { maybeOne, one, pool } from '../db/pool';
import { hashPassword } from '../lib/password';
import { createBoard, getBoard, setStarred } from '../modules/boards/boards.service';
import { updateLabel } from '../modules/boards/labels.service';
import { addMember } from '../modules/boards/members.service';
import {
  addAssignee,
  addChecklistItem,
  addComment,
  addLabel,
  createCard,
  moveCard,
  updateCard,
  updateChecklistItem,
} from '../modules/cards/cards.service';
import { createList } from '../modules/lists/lists.service';

const PASSWORD = 'demo-password';
const day = 86_400_000;
// Due dates land on the half hour, so the demo shows "5:30 PM" rather than "5:47 PM".
const inDays = (n: number) =>
  new Date(Math.ceil((Date.now() + n * day) / 1_800_000) * 1_800_000).toISOString();

async function createUser(name: string, email: string) {
  const { id } = await one<{ id: string }>(
    pool,
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [email, name, await hashPassword(PASSWORD)],
  );
  const ctx: Ctx = { userId: id, clientId: null };
  return { id, ctx };
}

async function main() {
  await migrate();
  if (await maybeOne(pool, 'SELECT 1 FROM users WHERE email = $1', ['demo@tack.dev'])) {
    console.log('Demo data is already in place. Nothing to do.');
    return;
  }

  const maya = await createUser('Maya Chen', 'demo@tack.dev');
  const priya = await createUser('Priya Nair', 'priya@tack.dev');
  await createUser('Sam Okafor', 'sam@tack.dev');

  // ---- Website relaunch ---------------------------------------------------------------------
  const relaunch = await createBoard(maya.ctx, {
    title: 'Website relaunch',
    background: 'moss',
    template: 'blank',
  });
  await setStarred(maya.ctx, relaunch.id, true);
  await addMember(maya.ctx, relaunch.id, { email: 'priya@tack.dev', role: 'editor' });
  await addMember(maya.ctx, relaunch.id, { email: 'sam@tack.dev', role: 'viewer' });

  const names = {
    green: 'Content',
    yellow: 'Needs review',
    orange: 'Blocked',
    red: 'Bug',
    purple: 'Design',
    blue: 'Engineering',
  } as const;
  for (const existing of (await getBoard(maya.ctx, relaunch.id)).labels) {
    const name = names[existing.color as keyof typeof names];
    if (name) await updateLabel(maya.ctx, relaunch.id, existing.id, { name });
  }
  const named = (await getBoard(maya.ctx, relaunch.id)).labels;
  const label = (name: string) => (named.find((l) => l.name === name) ?? fail(`label ${name}`)).id;

  const backlog = await createList(maya.ctx, relaunch.id, { title: 'Backlog' });
  const sprint = await createList(maya.ctx, relaunch.id, { title: 'This sprint' });
  const review = await createList(maya.ctx, relaunch.id, { title: 'In review' });
  const shipped = await createList(maya.ctx, relaunch.id, { title: 'Shipped' });

  async function card(
    owner: Ctx,
    listId: string,
    title: string,
    extra: {
      description?: string;
      due?: number;
      labels?: string[];
      assignees?: string[];
      checklist?: [string, boolean][];
      done?: boolean;
    } = {},
  ) {
    const created = await createCard(owner, listId, { title });
    if (extra.description || extra.due !== undefined) {
      await updateCard(owner, created.id, {
        ...(extra.description && { description: extra.description }),
        ...(extra.due !== undefined && { dueAt: inDays(extra.due) }),
      });
    }
    for (const name of extra.labels ?? []) await addLabel(owner, created.id, label(name));
    for (const userId of extra.assignees ?? []) await addAssignee(owner, created.id, userId);
    for (const [text, done] of extra.checklist ?? []) {
      const withItem = await addChecklistItem(owner, created.id, { text });
      if (done) {
        await updateChecklistItem(owner, created.id, withItem.checklist.at(-1)!.id, { done: true });
      }
    }
    if (extra.done) await updateCard(owner, created.id, { completed: true });
    return created.id;
  }

  await card(maya.ctx, backlog.id, 'Audit old URLs and plan redirects', {
    labels: ['Engineering'],
    due: 10,
    description:
      'The old site has roughly 340 indexed URLs. Before launch we need a redirect map so nothing 404s.\n\n' +
      '- Export the sitemap and the top 100 pages by traffic\n- Group them by new section\n- Hand the map to whoever sets up the redirects\n',
  });
  await card(priya.ctx, backlog.id, 'Write the pricing FAQ', {
    labels: ['Content'],
    assignees: [priya.id],
  });
  const analytics = await card(maya.ctx, backlog.id, 'Pick an analytics setup');
  await card(priya.ctx, backlog.id, 'Translate the homepage into Spanish', {
    labels: ['Content'],
    due: 21,
  });

  const pricing = await card(maya.ctx, sprint.id, 'Rebuild the pricing page', {
    labels: ['Design', 'Engineering'],
    assignees: [maya.id, priya.id],
    due: 3,
    description:
      'Three plans, annual toggle, and a comparison table that works on a phone.\n\n' +
      'Design is signed off in Figma. Open question: do we show prices with or without tax?',
    checklist: [
      ['Plan cards and annual toggle', true],
      ['Comparison table', true],
      ['Mobile layout', false],
      ['Hook up the checkout links', false],
    ],
  });
  await addComment(priya.ctx, pricing, {
    body: 'Mobile layout is next. I should have a draft up for review tomorrow.',
  });
  await card(maya.ctx, sprint.id, 'Fix flaky checkout test', {
    labels: ['Bug'],
    assignees: [maya.id],
    due: -1,
  });
  await card(priya.ctx, sprint.id, 'Compress hero images', {
    labels: ['Engineering'],
    due: 0.5,
    checklist: [
      ['Export at 2x', true],
      ['Convert to AVIF', false],
      ['Check the layout shift score', false],
    ],
  });
  await card(maya.ctx, sprint.id, 'Set up uptime monitoring', {
    labels: ['Engineering', 'Blocked'],
  });

  const copy = await card(priya.ctx, sprint.id, 'Homepage copy pass', {
    labels: ['Content', 'Needs review'],
    assignees: [priya.id],
  });
  await moveCard(priya.ctx, copy, { listId: review.id, afterId: null });
  await addComment(maya.ctx, copy, {
    body: 'The hero line is much better. Can we cut the second paragraph by half?',
  });
  await addComment(priya.ctx, copy, { body: 'Done. Trimmed it and moved the testimonial up.' });

  await card(maya.ctx, review.id, 'Accessibility check on the signup form', {
    labels: ['Design'],
    due: 2,
  });

  await card(maya.ctx, shipped.id, 'New logo and favicon', {
    labels: ['Design'],
    due: -6,
    done: true,
  });
  await card(maya.ctx, shipped.id, 'Move DNS to the new provider', {
    labels: ['Engineering'],
    due: -4,
    done: true,
  });
  await card(priya.ctx, shipped.id, 'Reword the cookie banner', {
    labels: ['Content'],
    due: -2,
    done: true,
  });

  await addComment(maya.ctx, analytics, {
    body: 'Leaning towards a cookieless option so we can drop the banner entirely.',
  });

  // ---- A smaller personal board -------------------------------------------------------------
  const reading = await createBoard(maya.ctx, {
    title: 'Reading list',
    background: 'navy',
    template: 'kanban',
  });
  const readingBoard = await getBoard(maya.ctx, reading.id);
  const [toRead, doing, done] = readingBoard.lists;
  for (const title of ['Designing Data-Intensive Applications', 'The Pragmatic Programmer']) {
    await card(maya.ctx, toRead!.id, title);
  }
  await card(maya.ctx, doing!.id, 'A Philosophy of Software Design', {
    checklist: [
      ['Chapters 1 to 6', true],
      ['Chapters 7 to 12', false],
    ],
  });
  await card(maya.ctx, done!.id, 'Refactoring UI', { done: true });

  // ---- A board someone else shared with Maya ------------------------------------------------
  const offsite = await createBoard(priya.ctx, {
    title: 'Team offsite',
    background: 'plum',
    template: 'blank',
  });
  await addMember(priya.ctx, offsite.id, { email: 'demo@tack.dev', role: 'editor' });
  const ideas = await createList(priya.ctx, offsite.id, { title: 'Ideas' });
  const booked = await createList(priya.ctx, offsite.id, { title: 'Booked' });
  await card(priya.ctx, ideas.id, 'Two days in Lisbon', { due: 40 });
  await card(priya.ctx, ideas.id, 'Cabin in the hills');
  await card(priya.ctx, booked.id, 'Book the train tickets', { assignees: [priya.id], due: 14 });

  console.log(`\nSeeded demo data. Sign in with:\n  demo@tack.dev  /  ${PASSWORD}\n`);
}

function fail(what: string): never {
  throw new Error(`Seed expected ${what} to exist`);
}

try {
  await main();
} finally {
  await pool.end();
}
