-- Growers Notebook — demo data (idempotent). Safe to re-run.
-- Demo profile UUIDs are not Supabase Auth users; real users get profiles on first API hit.

INSERT INTO public.profiles (id, display_name, role) VALUES
('f1000000-0000-4000-8000-000000000001', 'Demo Gardener', 'member'),
('f1000000-0000-4000-8000-000000000002', 'Seed Moderator', 'moderator')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.communities (id, slug, name, description) VALUES
('f2000000-0000-4000-8000-000000000001', 'general', 'General', 'Announcements, meta, and wide-ranging grow talk.'),
('f2000000-0000-4000-8000-000000000002', 'grow-journal', 'Grow Journal', 'Week-by-week notes, environments, and lessons learned.'),
('f2000000-0000-4000-8000-000000000003', 'genetics', 'Genetics & lineage', 'Breeding goals, cultivar notes, and stabilization journeys.'),
('f2000000-0000-4000-8000-000000000004', 'indoor', 'Indoor', 'Tents, closets, and full indoor setups—environment control and day-to-day indoor workflows.'),
('f2000000-0000-4000-8000-000000000005', 'outdoor', 'Outdoor', 'Backyard, balcony, guerilla, and greenhouse grows—sun, season, and weather.'),
('f2000000-0000-4000-8000-000000000006', 'autoflowers', 'Autoflowers', 'Autos from seed to harvest—schedules, pot size, and getting the most from short cycles.'),
('f2000000-0000-4000-8000-000000000007', 'photoperiod', 'Photoperiod', 'Traditional photos—veg time, flipping to flower, and light-dep strategies.'),
('f2000000-0000-4000-8000-000000000008', 'soil-organic', 'Soil & organic', 'Living soil, supersoil, compost teas, no-till, and organic amendments.'),
('f2000000-0000-4000-8000-000000000009', 'hydro-coco', 'Hydro & coco', 'Coco coir, DWC, RDWC, drain-to-waste, and hydro nutrient strategy.'),
('f2000000-0000-4000-8000-000000000010', 'nutrients', 'Nutrients & feeding', 'Schedules, EC/PPM, pH, deficiency troubleshooting, and calmag debates.'),
('f2000000-0000-4000-8000-000000000011', 'lighting', 'Lighting', 'LED, HID, spectrum, wattage, PPFD/DLI, and hang-height tips.'),
('f2000000-0000-4000-8000-000000000012', 'environment', 'Environment & VPD', 'Temperature, humidity, airflow, CO₂, controllers, and VPD targets.'),
('f2000000-0000-4000-8000-000000000013', 'pests-ipm', 'Pests & IPM', 'Prevention, ID, beneficials, sprays, and integrated pest management.'),
('f2000000-0000-4000-8000-000000000014', 'harvest-cure', 'Harvest, dry & cure', 'Chop timing, drying, trimming, jars, burping, and terp preservation.'),
('f2000000-0000-4000-8000-000000000015', 'canopy-training', 'Canopy & training', 'LST, HST, topping, SCROG, trellis, and leaf management.'),
('f2000000-0000-4000-8000-000000000016', 'propagation', 'Propagation', 'Germination, clones, mothers, seedlings, and root health.'),
('f2000000-0000-4000-8000-000000000017', 'solventless', 'Solventless', 'Rosin, ice water hash, pressed hash, dry sift, and mechanical separation—wash temps, bags, presses, and cold cure.'),
('f2000000-0000-4000-8000-000000000018', 'edibles', 'Edibles & infusions', 'Decarb, dosing math, butter, oil, glycerin, gummies, and keeping kitchens consistent batch to batch.'),
('f2000000-0000-4000-8000-000000000019', 'gear', 'Gear & equipment', 'Lights, tents, fans, timers, trimmers, presses, and lab tools—what holds up in real rooms.'),
('f2000000-0000-4000-8000-000000000020', 'bubble-hash', 'Ice water hash', 'Wash workflow, material prep, micron bags, freeze-dry vs air dry, grading, and full-melt goals.'),
('f2000000-0000-4000-8000-000000000021', 'rosin', 'Rosin pressing', 'Bottle tech, bags, plates, pressure, cure, and consistency—from flower to hash rosin.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.posts (id, community_id, author_id, title, body_json, body_html, excerpt, created_at, updated_at) VALUES
(
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'Welcome to Growers Notebook',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This seeded post shows communities, rich HTML bodies, and the Reddit-style feed. Open a community and use New post after you sign in."}]}]}'::jsonb,
  '<p>This seeded post shows communities, rich HTML bodies, and the Reddit-style feed. Open a community and use <strong>New post</strong> after you sign in.</p>',
  'This seeded post shows communities, rich HTML bodies, and the Reddit-style feed.',
  now(),
  now()
),
(
  'f3000000-0000-4000-8000-000000000002',
  'f2000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000002',
  'Template: first two weeks of veg',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Stabilize environment before pushing growth: VPD, light height, and watering rhythm. Log anything that changes so you can correlate cause and effect later."}]}]}'::jsonb,
  '<p>Stabilize environment before pushing growth: VPD, light height, and watering rhythm. Log anything that changes so you can correlate cause and effect later.</p>',
  'Stabilize environment before pushing growth: VPD, light height, and watering rhythm.',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments (id, post_id, author_id, parent_id, body) VALUES
(
  'f4000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000002',
  NULL,
  'Tip: promote a real account to admin with UPDATE public.profiles SET role = ''admin'' WHERE id = ''<your_auth_user_uuid>''; then open /admin directly.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_votes (user_id, post_id, value) VALUES
('f1000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000001', 1),
('f1000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 1)
ON CONFLICT (user_id, post_id) DO NOTHING;
