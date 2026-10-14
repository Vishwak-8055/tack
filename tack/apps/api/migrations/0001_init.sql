-- Initial schema.
--
-- Ordering columns (position) are fractional-index strings and must sort bytewise, hence
-- COLLATE "C". Everything that belongs to a board is deleted with it (ON DELETE CASCADE).

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_is_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Opaque session tokens. Only a SHA-256 of the token is stored, so a leaked table can't be replayed.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE boards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  background text NOT NULL DEFAULT 'moss',
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER boards_set_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE board_members (
  board_id  uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role      text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  starred   boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);
CREATE INDEX board_members_user_id_idx ON board_members (user_id);

CREATE TABLE labels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  color      text NOT NULL,
  -- clock_timestamp() (not now()) so labels created in one transaction keep their order
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX labels_board_id_idx ON labels (board_id);

CREATE TABLE lists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  title      text NOT NULL,
  position   text COLLATE "C" NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lists_id_board_id_key UNIQUE (id, board_id)
);
CREATE INDEX lists_board_id_position_idx ON lists (board_id, position);
CREATE TRIGGER lists_set_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- board_id is duplicated on purpose: it makes "all cards on this board" a single index scan, and
-- the composite foreign key guarantees a card can never point at a list from another board.
CREATE TABLE cards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     uuid NOT NULL,
  list_id      uuid NOT NULL,
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  position     text COLLATE "C" NOT NULL,
  due_at       timestamptz,
  completed_at timestamptz,
  created_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (list_id, board_id) REFERENCES lists (id, board_id) ON DELETE CASCADE
);
CREATE INDEX cards_list_id_position_idx ON cards (list_id, position);
CREATE INDEX cards_board_id_idx ON cards (board_id);
CREATE TRIGGER cards_set_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE card_labels (
  card_id  uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);
CREATE INDEX card_labels_label_id_idx ON card_labels (label_id);

CREATE TABLE card_assignees (
  card_id uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);
CREATE INDEX card_assignees_user_id_idx ON card_assignees (user_id);

CREATE TABLE checklist_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  text       text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  position   text COLLATE "C" NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checklist_items_card_id_position_idx ON checklist_items (card_id, position);

CREATE TABLE comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  author_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at  timestamptz
);
CREATE INDEX comments_card_id_created_at_idx ON comments (card_id, created_at);

-- Titles are copied into "data" so the feed still reads well after a card or list is deleted.
CREATE TABLE activities (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id   uuid NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  card_id    uuid REFERENCES cards (id) ON DELETE SET NULL,
  actor_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  type       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_board_id_id_idx ON activities (board_id, id DESC);
