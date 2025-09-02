-- Dedupe 'memoriesVault Demo' teams and enforce uniqueness going forward
DO $$
DECLARE
  canonical_team_id INTEGER;
BEGIN
  -- Pick one canonical team (lowest id) for the Demo name
  SELECT id INTO canonical_team_id FROM teams WHERE name = 'memoriesVault Demo' ORDER BY id ASC LIMIT 1;

  IF canonical_team_id IS NOT NULL THEN
    -- Repoint events to canonical team
    UPDATE events e
    SET team_id = canonical_team_id
    WHERE team_id IN (
      SELECT id FROM teams WHERE name = 'memoriesVault Demo' AND id <> canonical_team_id
    );

    -- Repoint invitations to canonical team
    UPDATE invitations i
    SET team_id = canonical_team_id
    WHERE team_id IN (
      SELECT id FROM teams WHERE name = 'memoriesVault Demo' AND id <> canonical_team_id
    );

    -- Repoint activity logs to canonical team
    UPDATE activity_logs al
    SET team_id = canonical_team_id
    WHERE team_id IN (
      SELECT id FROM teams WHERE name = 'memoriesVault Demo' AND id <> canonical_team_id
    );

    -- Repoint team_members to canonical team, avoiding duplicates via DISTINCT ON
    -- (Perform delete of duplicates after repoint)
    UPDATE team_members tm
    SET team_id = canonical_team_id
    WHERE team_id IN (
      SELECT id FROM teams WHERE name = 'memoriesVault Demo' AND id <> canonical_team_id
    );

    -- Remove duplicate memberships (same user, same canonical team)
    DELETE FROM team_members a USING team_members b
    WHERE a.id > b.id AND a.user_id = b.user_id AND a.team_id = b.team_id;

    -- Delete other Demo teams, keep canonical
    DELETE FROM teams WHERE name = 'memoriesVault Demo' AND id <> canonical_team_id;
  END IF;
END $$;
--> statement-breakpoint

-- Enforce uniqueness on Demo team name specifically (partial unique index)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'teams_demo_name_unique'
  ) THEN
    CREATE UNIQUE INDEX teams_demo_name_unique ON teams (name) WHERE (name = 'memoriesVault Demo');
  END IF;
END $$;