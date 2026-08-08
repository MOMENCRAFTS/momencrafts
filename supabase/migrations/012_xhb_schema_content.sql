-- ═══════════════════════════════════════════════════════════════════════════
-- XHB Access Gate — Part A: Content tables + seed
-- Run after supabase_setup_v2.sql (which creates the public.* HQ tables).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SCHEMA BOUNDARY
-- ───────────────
-- public.*           — MomenCrafts investor portal (investor_tokens,
--                      investor_sessions, investor_events, access_requests).
--                      Dashboard access: momen@momencrafts.com.
--                      RLS: service-role only (edge functions).
--
-- xhb.*              — XHB Founders' HQ (sessions, questions, answers,
--                      plan_items, updates, documents, nudges, episodes,
--                      content, question_templates).
--                      Dashboard access: momen@momencrafts.com.
--                      Read/write: xhb.is_allowed() — allowlisted founders only.
--
-- NOTE: The existing HQ tables (sessions, questions, answers, etc.) currently
-- live in public.* per setup_v2.sql. They will be moved to xhb.* in the
-- Part B+C migration. This migration only creates the xhb schema and the
-- two new content tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- 0. Create the xhb schema
CREATE SCHEMA IF NOT EXISTS xhb;

-- 1. Content table — stores vision, template metadata, etc.
CREATE TABLE IF NOT EXISTS xhb.content (
  key        text NOT NULL,
  locale     text NOT NULL DEFAULT 'en',
  body       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, locale)
);

-- 2. Question templates — founding questions loaded after auth
CREATE TABLE IF NOT EXISTS xhb.question_templates (
  template_key text NOT NULL,
  position     int NOT NULL,
  prompt       text NOT NULL,
  context      text NOT NULL DEFAULT '',
  locale       text NOT NULL DEFAULT 'en',
  PRIMARY KEY (template_key, position, locale)
);

-- 3. RLS (uses public.is_allowed() for now — will be migrated to
--    xhb.is_allowed() in Part C)
ALTER TABLE xhb.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_read ON xhb.content
  FOR SELECT TO authenticated USING (public.is_allowed());

CREATE POLICY templates_read ON xhb.question_templates
  FOR SELECT TO authenticated USING (public.is_allowed());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Seed: Vision content
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO xhb.content (key, locale, body) VALUES (
  'vision', 'en', '{
    "line": "Compass governs the promise. Anchor verifies the proof. Field Evidence captures reality at the source.",
    "definition": "XHB is a governed decision-assurance platform for capital projects. Its shared Core converts traceable evidence into methodologically appropriate research, independent market challenge, cautious forecasts, and execution-feasible options — before an authorized human decides. The promise is not that AI knows the future. The promise is that XHB makes uncertainty visible, detects failure earlier, shows what evidence supports a conclusion, and separates what is technically possible from what an organization can realistically execute.",
    "products": [
      ["Compass 🧭", "For capital owners and investment committees. What should we fund, why, and can the organization realistically deliver it?"],
      ["Anchor ⚓", "For delivery assurance. What was actually delivered, what does the evidence prove, and are the claims justified?"],
      ["Field Evidence 📱", "Mobile capture at the source. What was observed on site, by whom, and is its chain of custody preserved?"]
    ],
    "nongoals": [
      "No autonomous critical actions — a named human decides at every gate.",
      "No personnel honesty or reliability scores — we measure submission and evidence quality only.",
      "No invented probabilities — risk flags and benchmarked ranges until models are validated.",
      "No Field Evidence app before Phase 4.",
      "No consultant marketplace — two contracted consultants and a protocol first.",
      "No dispute adjudication — the system prepares, humans and law decide.",
      "No cross-client data mixing, ever.",
      "No dozens of agents before one closed loop proves value."
    ],
    "phases": [
      ["P0", "Governed foundation — entity, evidence snapshots, node registry, one defined decision."],
      ["P1", "6–8 week historical feasibility pilot on 3–5 completed projects. Detection lead time is the headline number."],
      ["P2", "Research assurance — method router, consultant dual-track, 20–50 project benchmark."],
      ["P3", "Execution feasibility — workforce capacity, lead-times, constraint scheduling."],
      ["P4", "Product connection — validated Compass + Anchor workflows, Field Evidence capture."],
      ["P5", "Controlled expansion — disputes, validated forecasts, pricing research."]
    ],
    "credit": "Concept & architecture: Mulham Al Zahabi · Technical build: Momen Pharaon — MomenCrafts · Source of truth: AI Forest Remastered Master Architecture v1.0"
  }'::jsonb
) ON CONFLICT (key, locale) DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Seed: Template metadata (names and descriptions)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO xhb.content (key, locale, body) VALUES (
  'template_meta', 'en', '{
    "founding": {"name": "Founding & Equity", "desc": "Entity, split, roles, triggers — the Part III §21 set."},
    "ip":       {"name": "IP & Ownership", "desc": "Assignment, patent, employment cleanliness."},
    "phase1":   {"name": "Phase 1 Pilot (SOW)", "desc": "The 6–8 week historical feasibility pilot from the remaster."},
    "product":  {"name": "Product & Architecture", "desc": "Source of truth, ALLAM narrative, MVP exclusions."},
    "wow":      {"name": "Ways of Working", "desc": "Decision rights, cadence, deadlocks, confidentiality."}
  }'::jsonb
) ON CONFLICT (key, locale) DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Seed: Question templates (all 5 sessions + questions)
-- ═══════════════════════════════════════════════════════════════════════════
DELETE FROM xhb.question_templates WHERE locale = 'en';

-- Founding & Equity
INSERT INTO xhb.question_templates (template_key, position, prompt, context) VALUES
  ('founding', 0, 'Do we form the XHB entity now, and in which jurisdiction?', 'IP is already accumulating across two contributors and three documents. Formation before code starts keeps ownership clean.'),
  ('founding', 1, 'What is the equity split between Mulham and Momen/MomenCrafts, and what vesting ties it to milestones?', 'Consider Phase 1 delivery, first paid client, and funding close as vesting gates.'),
  ('founding', 2, 'Is Momen engaged as co-founder & technical lead, or MomenCrafts as a contracted studio?', 'The two answers produce very different investor diligence outcomes — choose deliberately, not by default.'),
  ('founding', 3, 'What triggers full-time commitment for each of us?', 'Funding amount, pilot signed, or a calendar date — name it.'),
  ('founding', 4, E'If HUMAIN\'s answer is slow or no, what is the runway plan and who funds Phase 1?', 'Tranche structure, NTDP, private lane — decide the fallback before it is needed.');

-- IP & Ownership
INSERT INTO xhb.question_templates (template_key, position, prompt, context) VALUES
  ('ip', 0, 'Do we assign the concept, all documents (deck, spec, remaster), and all code to the entity on formation?', 'One owner for everything, from day one.'),
  ('ip', 1, 'Who files the provisional patent on evidence-quality / submission-reliability scoring, and by when?', 'File before the mechanism is shown externally.'),
  ('ip', 2, E'Is Mulham\'s employment IP position reviewed and documented?', 'One page, lawyer-reviewed, ready for diligence. Owner and date.'),
  ('ip', 3, 'What is our policy on open-sourcing any component?', 'Default: nothing, until decided here.'),
  ('ip', 4, 'Who owns the XHB brand assets and domain strategy?', 'xhb.momencrafts.com now — standalone domain when?');

-- Phase 1 Pilot (SOW)
INSERT INTO xhb.question_templates (template_key, position, prompt, context) VALUES
  ('phase1', 0, E'Which 3\u20135 completed projects do we use, and who controls access to their documents?', 'At least one healthy control project. This is the single most important open item.'),
  ('phase1', 1, 'What is the precise endpoint definition and organizational recognition date for each project?', E'Remaster \u00a731 step 2 \u2014 vague endpoints invalidate the backtest.'),
  ('phase1', 2, 'Which five warning checks ship in the pilot?', 'Suggested: milestone slippage, aging decisions, cost-progress divergence, unsupported VO/invoice evidence, expired critical assumption.'),
  ('phase1', 3, 'Who is consultant #1 for the dual-track sealed review, and on what fee basis?', 'Fixed or effort-based, never conclusion-dependent.'),
  ('phase1', 4, 'What does pilot success mean commercially?', E'Does the pilot organization convert to a paid Foundation Phase? Record the buyer\'s name.'),
  ('phase1', 5, 'What is the pilot start date, counted from document access?', E'The 6\u20138 week timebox begins only when documents are in hand.');

-- Product & Architecture
INSERT INTO xhb.question_templates (template_key, position, prompt, context) VALUES
  ('product', 0, 'What is our one ALLAM sentence for HUMAIN, used identically everywhere?', E'Core + gateway narrative \u2014 decided once.'),
  ('product', 1, 'Do we adopt the remaster as single source of truth v1.0 and freeze documents until Phase 1 produces data?', 'Deck and spec become derived documents.'),
  ('product', 2, 'Which MVP exclusions do we both commit not to build early?', E'Per the remaster\'s own exclusion list.'),
  ('product', 3, 'Who owns deck v2 reconciliation, and by when?', E'Trust-score wording, 11-agents slide, ALLAM framing \u2014 one pass.'),
  ('product', 4, 'What stack do we lock for the pilot?', E'Hosting, data store, model access path \u2014 revisited after Phase 1.');

-- Ways of Working
INSERT INTO xhb.question_templates (template_key, position, prompt, context) VALUES
  ('wow', 0, 'Decision rights: what does Mulham decide alone, what does Momen decide alone, what needs both?', 'Domain truth vs. technical architecture vs. money.'),
  ('wow', 1, 'What is our meeting cadence, and is this HQ the official decision log?', 'If a decision is not logged here, did it happen?'),
  ('wow', 2, 'How do we resolve a deadlock?', 'Defer to domain owner, third adjudicator, or park with expiry.'),
  ('wow', 3, 'What are our confidentiality rules for sharing XHB material?', 'Who may see the remaster, the deck, the pilot data.'),
  ('wow', 4, 'When do we revisit equity and roles?', E'A fixed date or a milestone \u2014 agreed now.');

-- ═══════════════════════════════════════════════════════════════════════════
-- REQUIRED: Expose the xhb schema to PostgREST API
-- In Supabase Dashboard: Settings → API → Additional API schemas → add "xhb"
-- Without this, sb.schema('xhb').from(...) will return 404.
-- ═══════════════════════════════════════════════════════════════════════════
