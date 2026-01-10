-- System Settings Table (for API keys and global config)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only global_admin can read/write settings
CREATE POLICY "Global admins can manage settings" ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'global_admin'
    )
  );

-- Insert default settings
INSERT INTO system_settings (key, value, description, is_secret) VALUES
  ('tmdb_api_key', '', 'TMDB API Key for movie lookups', true),
  ('app_name', 'Cinema Automation Tool', 'Application name displayed in UI', false),
  ('default_language', 'en', 'Default language for the application', false),
  ('movies_per_page', '20', 'Number of movies to display per page', false),
  ('sessions_per_page', '50', 'Number of sessions to display per page', false)
ON CONFLICT (key) DO NOTHING;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System/admins can insert notifications for any user
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('global_admin', 'internal_admin')
    )
    OR user_id = auth.uid()
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users with specific role
CREATE OR REPLACE FUNCTION notify_role(
  p_role TEXT,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT id FROM user_profiles WHERE role = p_role AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_user.id, p_title, p_message, p_type, p_link);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when movie needs verification
CREATE OR REPLACE FUNCTION notify_unverified_movie() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_verified = false AND (OLD IS NULL OR OLD.is_verified = true) THEN
    PERFORM notify_role(
      'internal_admin',
      'New movie pending verification',
      'Movie "' || NEW.original_title || '" needs verification.',
      'warning',
      '/movies/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_unverified_movie ON movies_l0;
CREATE TRIGGER trigger_notify_unverified_movie
  AFTER INSERT OR UPDATE ON movies_l0
  FOR EACH ROW
  EXECUTE FUNCTION notify_unverified_movie();
