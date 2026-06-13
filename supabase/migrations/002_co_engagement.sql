-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS & CO — Phase 2 Migration
-- 8 New Tables for Engagement Features
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. co_journal ──────────────────────────────────────
-- Studio Journal entries (news, launches, patents, milestones)
CREATE TABLE IF NOT EXISTS co_journal (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category     TEXT NOT NULL CHECK (category IN ('launch','update','patent','milestone','community')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  product      TEXT,                           -- nullable, e.g. 'Cliniq', 'Ummi'
  credit       TEXT,                           -- co-builder credit attribution
  pinned       BOOLEAN DEFAULT FALSE,
  published    BOOLEAN DEFAULT TRUE,
  publish_date DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_date ON co_journal(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_cat  ON co_journal(category);

-- ─── 2. co_downloads ────────────────────────────────────
-- APK/IPA download entries
CREATE TABLE IF NOT EXISTS co_downloads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id       TEXT NOT NULL UNIQUE,            -- 'cliniq-patient', 'rogerai'
  name         TEXT NOT NULL,                   -- 'Cliniq Patient'
  name_ar      TEXT NOT NULL,                   -- 'كلينيك المريض'
  version      TEXT NOT NULL,                   -- 'v2.4.1'
  status       TEXT NOT NULL CHECK (status IN ('live','beta','dev','disabled')),
  emoji        TEXT DEFAULT '📱',
  size         TEXT,                            -- '63 MB'
  description  TEXT,
  apk_url      TEXT,                            -- direct URL or null (WhatsApp request)
  testflight   TEXT,                            -- TestFlight URL for iOS
  sort_order   INT DEFAULT 0,
  visible      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. co_traction ─────────────────────────────────────
-- KPI metrics for the progress dashboard
CREATE TABLE IF NOT EXISTS co_traction (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_key   TEXT NOT NULL UNIQUE,            -- 'products_built', 'patents_filed'
  label        TEXT NOT NULL,                   -- 'Products Built'
  value        TEXT NOT NULL,                   -- '10', '280K+'
  icon         TEXT DEFAULT '📊',
  sort_order   INT DEFAULT 0,
  visible      BOOLEAN DEFAULT TRUE,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. co_product_progress ─────────────────────────────
-- Per-product readiness bars
CREATE TABLE IF NOT EXISTS co_product_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,            -- 'Cliniq.one'
  pct          INT NOT NULL CHECK (pct >= 0 AND pct <= 100),
  status       TEXT NOT NULL,                   -- 'Live with users'
  color        TEXT DEFAULT '#C8A96E',          -- bar color hex
  sort_order   INT DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. co_board ────────────────────────────────────────
-- Co-builder idea/bug/feature board
CREATE TABLE IF NOT EXISTS co_board (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  body         TEXT,
  product      TEXT,                            -- 'Cliniq', 'Ummi', 'RelayBot'
  type         TEXT NOT NULL CHECK (type IN ('idea','bug','feature','suggestion')),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','implemented','rejected')),
  author_name  TEXT,                            -- display name of submitter
  author_token TEXT,                            -- MCR-XXXX link (optional)
  votes        INT DEFAULT 0,
  admin_note   TEXT,                            -- internal admin note
  pinned       BOOLEAN DEFAULT FALSE,
  visible      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_status  ON co_board(status);
CREATE INDEX IF NOT EXISTS idx_board_product ON co_board(product);
CREATE INDEX IF NOT EXISTS idx_board_date    ON co_board(created_at DESC);

-- ─── 6. co_feedback ─────────────────────────────────────
-- Quick feedback / reactions from investors
CREATE TABLE IF NOT EXISTS co_feedback (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id     UUID REFERENCES investor_tokens(id) ON DELETE SET NULL,
  section      TEXT,                            -- which section they're on
  rating       INT CHECK (rating >= 1 AND rating <= 5),
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_token ON co_feedback(token_id);

-- ─── 7. co_registry ─────────────────────────────────────
-- The & Co Registry — permanent record of co-builders
CREATE TABLE IF NOT EXISTS co_registry (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,                 -- 'Ahmed Al-Rashidi'
  contribution    TEXT NOT NULL,                 -- 'Suggested body location picker for AI intake'
  product         TEXT,                          -- 'Cliniq'
  board_id        UUID REFERENCES co_board(id) ON DELETE SET NULL,
  token_id        UUID REFERENCES investor_tokens(id) ON DELETE SET NULL,
  badge           TEXT DEFAULT 'co-builder',     -- 'co-builder', 'beta-tester', 'bug-hunter'
  registered_at   TIMESTAMPTZ DEFAULT now(),
  visible         BOOLEAN DEFAULT TRUE
);

-- ─── 8. co_chat ─────────────────────────────────────────
-- Discussion / chat messages from investors
CREATE TABLE IF NOT EXISTS co_chat (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id     UUID REFERENCES investor_tokens(id) ON DELETE SET NULL,
  author_name  TEXT NOT NULL,
  message      TEXT NOT NULL,
  reply_to     UUID REFERENCES co_chat(id) ON DELETE SET NULL,
  pinned       BOOLEAN DEFAULT FALSE,
  visible      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_date  ON co_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_token ON co_chat(token_id);

-- ═══════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════

-- Co Impact summary
CREATE OR REPLACE VIEW co_impact_summary AS
SELECT
  (SELECT COUNT(*) FROM co_board WHERE type = 'bug')::int AS bugs_reported,
  (SELECT COUNT(*) FROM co_board WHERE type IN ('idea','feature','suggestion'))::int AS suggestions,
  (SELECT COUNT(*) FROM co_board WHERE status = 'implemented')::int AS ideas_shipped,
  (SELECT COUNT(DISTINCT name) FROM co_registry)::int AS co_builders;

-- Board with author info
CREATE OR REPLACE VIEW co_board_public AS
SELECT
  b.id, b.title, b.body, b.product, b.type, b.status,
  b.author_name, b.votes, b.pinned, b.created_at
FROM co_board b
WHERE b.visible = TRUE
ORDER BY b.pinned DESC, b.created_at DESC;

-- Registry public view
CREATE OR REPLACE VIEW co_registry_public AS
SELECT
  r.id, r.name, r.contribution, r.product, r.badge, r.registered_at
FROM co_registry r
WHERE r.visible = TRUE
ORDER BY r.registered_at DESC;

-- ═══════════════════════════════════════════════════════════
-- RLS — same pattern as existing tables
-- ═══════════════════════════════════════════════════════════
ALTER TABLE co_journal          ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_downloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_traction         ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_product_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_board            ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_registry         ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_chat             ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA (initial values matching current hardcoded UI)
-- ═══════════════════════════════════════════════════════════

-- Traction KPIs
INSERT INTO co_traction (metric_key, label, value, icon, sort_order) VALUES
  ('products_built',  'Products Built', '10',    '📦', 1),
  ('patents_filed',   'Patents Filed',  '2',     '📜', 2),
  ('apps_in_beta',    'Apps in Beta',   '4',     '🧪', 3),
  ('industries',      'Industries',     '5',     '🏢', 4),
  ('lines_of_code',   'Lines of Code',  '280K+', '💻', 5),
  ('solo_founder',    'Solo Founder',   '1',     '👤', 6)
ON CONFLICT (metric_key) DO NOTHING;

-- Product Progress
INSERT INTO co_product_progress (product_name, pct, status, color, sort_order) VALUES
  ('Cliniq.one',   85, 'Live with users',    '#0e7490', 1),
  ('Ummi Wallet',  75, 'Beta — 28 modules',  '#22c55e', 2),
  ('Roger·AI',     60, 'Private beta',       '#C8A96E', 3),
  ('RelayBot',     45, 'Hardware prototype',  '#a855f7', 4),
  ('Qadaa',        20, 'Architecture phase',  '#3b82f6', 5)
ON CONFLICT (product_name) DO NOTHING;

-- Downloads
INSERT INTO co_downloads (app_id, name, name_ar, version, status, emoji, size, description, sort_order) VALUES
  ('cliniq-patient', 'Cliniq Patient', 'كلينيك المريض', 'v2.4.1', 'live', '🏥', '63 MB', 'Patient-facing telemedicine app with AI intake', 1),
  ('cliniq-doctor',  'Cliniq Doctor',  'كلينيك الطبيب', 'v2.3.0', 'live', '⚕️', '58 MB', 'Doctor dashboard with AI-assisted consultations', 2),
  ('rogerai',        'Roger·AI',       'رجر AI',       'v1.2.0', 'beta', '🎙️', '45 MB', 'Voice-first executive assistant', 3),
  ('ummi',           'Ummi Wallet',    'محفظة أمي',    'v3.1.0', 'beta', '💚', '52 MB', 'Family finance OS with mother care', 4),
  ('relaybot',       'RelayBot',       'ريلي بوت',     'v1.8.3', 'dev',  '⌨️', '12 MB', 'Companion app for RelayBot device', 5)
ON CONFLICT (app_id) DO NOTHING;

-- Journal seed
INSERT INTO co_journal (category, title, body, product, pinned, publish_date) VALUES
  ('launch', 'Cliniq.one Landing Page — Live', 'The public-facing landing page for Cliniq.one is now deployed. Patients can learn about the platform and doctors can request onboarding.', 'Cliniq', TRUE, '2026-06-12'),
  ('update', 'MomenCrafts & Co — Brand Alignment Complete', 'The entire investor portal has been rebranded to reflect the & Co philosophy. Every section now speaks the co-builder language.', NULL, TRUE, '2026-06-10'),
  ('patent', 'USPTO: Turbo Drone Circuit Patent Filed', 'Intelligent voltage sag compensation circuit for FPV drones. Patent covers the core detection and active compensation algorithm.', 'TDC', FALSE, '2025-05-15'),
  ('patent', 'USPTO: Edge Tack Patent Filed', 'Collapsible pneumatic trigger buttons integrated into a screen protector for mobile gaming. Patent covers the mechanical design.', 'EdgeTack', FALSE, '2025-05-10'),
  ('milestone', 'Ummi Wallet — 28 Modules Complete', 'All 28 financial modules are coded and functional: smart budgeting, pocket system, mother''s salary, emergency fund, IoT piggy bank, and more.', 'Ummi', FALSE, '2025-04-20'),
  ('community', 'First & Co Registry Entry', 'The first investor to have their suggestion implemented will be the inaugural entry in the & Co registry. Your name. Your contribution. Permanently recorded.', NULL, FALSE, '2026-06-13')
ON CONFLICT DO NOTHING;

-- Sample board posts
INSERT INTO co_board (title, product, type, status, author_name) VALUES
  ('Body location picker for AI intake', 'Cliniq', 'feature', 'reviewing', NULL),
  ('Dark mode for doctor dashboard', 'Cliniq', 'feature', 'new', NULL),
  ('Offline mode for RelayBot companion', 'RelayBot', 'feature', 'new', NULL),
  ('SAMA integration for Ummi Wallet', 'Ummi', 'idea', 'new', NULL)
ON CONFLICT DO NOTHING;
