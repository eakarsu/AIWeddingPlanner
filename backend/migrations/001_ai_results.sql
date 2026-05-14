-- Migration: Add ai_results table and ai_conversation_history table
-- Run this against the ai_wedding_planner database

CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  request_params JSONB,
  result_text TEXT NOT NULL,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_results_user_id ON ai_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_endpoint ON ai_results(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_results_created_at ON ai_results(created_at);

-- Conversation history for multi-turn AI chat
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

-- RSVP tokens for public RSVP links
CREATE TABLE IF NOT EXISTS rsvp_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_tokens_token ON rsvp_tokens(token);
