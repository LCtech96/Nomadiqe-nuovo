-- Create profile_views table to track profile visits
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at);

-- Enable RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_views
-- Anyone can insert a view (track visits)
CREATE POLICY "Anyone can track profile views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can see who viewed their profile
CREATE POLICY "Users can see who viewed their profile"
  ON profile_views FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Users can see their own viewing history
CREATE POLICY "Users can see their own viewing history"
  ON profile_views FOR SELECT
  TO authenticated
  USING (viewer_id = auth.uid());

-- Add comments_count to posts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'posts' AND column_name = 'comments_count') THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to increment comments count
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts 
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement comments count
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts 
  SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_post_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_comments(UUID) TO authenticated;

COMMENT ON TABLE profile_views IS 'Tracks profile views for analytics';
COMMENT ON FUNCTION increment_post_comments IS 'Increments the comments count for a post';
COMMENT ON FUNCTION decrement_post_comments IS 'Decrements the comments count for a post';
