-- ZAYRON-X: Reversible Unpublish for 23 defective articles (zero-defect standard)
-- Generated: 2026-09-06T12:12:35.301Z
-- RULE: DO NOT DELETE ROWS. Sets is_published = 0.
UPDATE articles 
SET is_published = 0, 
    updated_at = datetime('now')
WHERE id IN (
  'art_20633dd6-b08',
  'art_3eee6226-bbb',
  'art_b9675c80-1c8',
  'art_c20b2b16-4f7',
  'art_3bc448a7-8a8',
  'art_f3294a41-a2c',
  'art_ff449568-add',
  'art_22cb5d4a-cb0',
  'art_8fb36ee0-b03',
  'art_15a7bf73-374',
  'art_ad67124d-0a3',
  'art_9b27a595-cf9',
  'art_3f71aaa6-040',
  'art_ec24f13d-daa',
  'art_6c857a8e-27c',
  'art_044d6c9b-b41',
  'art_22f2dd07-f18',
  'art_63d19297-1f3',
  'art_b037670e-51a',
  'art_f49d59ef-105',
  'art_304b32ca-32a',
  'art_667c8b1c-23c',
  'art_d029b030-99a'
);
