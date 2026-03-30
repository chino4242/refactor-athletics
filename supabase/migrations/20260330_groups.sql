-- Groups / Parties
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  leader_id uuid REFERENCES users(id) NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Group membership
CREATE TABLE group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Weekly group challenges
CREATE TABLE group_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  metric text NOT NULL,
  target numeric NOT NULL,
  week_start date NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, week_start)
);

-- Indexes
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_challenges_week ON group_challenges(group_id, week_start);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;

-- Groups: viewable by all, manageable by leader
CREATE POLICY "Groups are viewable by everyone" ON groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders can update their groups" ON groups FOR UPDATE USING (auth.uid() = leader_id);
CREATE POLICY "Leaders can delete their groups" ON groups FOR DELETE USING (auth.uid() = leader_id);

-- Members: viewable by all, users manage own membership
CREATE POLICY "Members are viewable by everyone" ON group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Challenges: viewable by all, created by group leaders
CREATE POLICY "Challenges are viewable by everyone" ON group_challenges FOR SELECT USING (true);
CREATE POLICY "Leaders can create challenges" ON group_challenges FOR INSERT WITH CHECK (
  auth.uid() = (SELECT leader_id FROM groups WHERE id = group_id)
);
CREATE POLICY "Leaders can update challenges" ON group_challenges FOR UPDATE USING (
  auth.uid() = (SELECT leader_id FROM groups WHERE id = group_id)
);
