-- ============================================
-- Citadel POW - 테스트 데이터 삭제 스크립트
-- ============================================
-- 작성일: 2026-01-10
-- 용도: 기존 잘못된 데이터 삭제 후 재테스트
--
-- ⚠️ 주의: 이 스크립트는 Supabase SQL Editor에서 실행하세요
-- ⚠️ 실행 전 반드시 백업을 권장합니다!
-- ============================================

-- ============================================
-- 옵션 1: 특정 사용자의 데이터만 삭제 (권장)
-- ============================================

-- 1-1. 먼저 사용자 ID 확인
SELECT
  id,
  discord_id,
  discord_username,
  created_at
FROM users
WHERE discord_id = '1340338561899303005';  -- 본인의 Discord ID

-- 1-2. 해당 사용자의 세션 데이터 삭제
DELETE FROM study_sessions
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 1-3. 해당 사용자의 기부 데이터 삭제
DELETE FROM donations
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 1-4. 해당 사용자의 적립액 데이터 삭제
DELETE FROM accumulated_sats
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 1-5. (선택) 사용자 자체도 삭제하려면 아래 실행
-- DELETE FROM users WHERE discord_id = '1340338561899303005';

-- ============================================
-- 옵션 2: 모든 테스트 데이터 삭제 (주의!)
-- ============================================

-- ⚠️ 경고: 아래 스크립트는 모든 사용자의 데이터를 삭제합니다!
-- ⚠️ 프로덕션 환경에서는 절대 실행하지 마세요!

-- 2-1. 모든 세션 삭제
-- DELETE FROM study_sessions;

-- 2-2. 모든 기부 삭제
-- DELETE FROM donations;

-- 2-3. 모든 적립액 삭제
-- DELETE FROM accumulated_sats;

-- 2-4. 모든 Discord 포스트 삭제
-- DELETE FROM discord_posts;

-- 2-5. (선택) 모든 사용자 삭제
-- DELETE FROM users;

-- ============================================
-- 옵션 3: 잘못된 데이터만 선택적으로 삭제
-- ============================================

-- 3-1. duration_minutes가 0인 세션만 삭제
DELETE FROM study_sessions
WHERE duration_minutes = 0;

-- 3-2. status가 'pending'인 기부만 삭제
DELETE FROM donations
WHERE status = 'pending';

-- 3-3. 확인: 남은 데이터 개수
SELECT
  (SELECT COUNT(*) FROM study_sessions) as sessions_count,
  (SELECT COUNT(*) FROM donations WHERE status = 'completed') as donations_count,
  (SELECT COUNT(*) FROM users) as users_count;

-- ============================================
-- 옵션 4: 데이터 확인 (삭제 전 확인용)
-- ============================================

-- 4-1. 현재 세션 데이터 확인
SELECT
  u.discord_username,
  COUNT(*) as session_count,
  SUM(s.duration_minutes) as total_minutes,
  MIN(s.duration_minutes) as min_minutes,
  MAX(s.duration_minutes) as max_minutes
FROM study_sessions s
JOIN users u ON s.user_id = u.id
GROUP BY u.discord_username;

-- 4-2. 현재 기부 데이터 확인
SELECT
  u.discord_username,
  d.status,
  COUNT(*) as donation_count,
  SUM(d.amount) as total_donated
FROM donations d
JOIN users u ON d.user_id = u.id
GROUP BY u.discord_username, d.status
ORDER BY u.discord_username, d.status;

-- 4-3. status별 기부 개수
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM donations
GROUP BY status;

-- ============================================
-- 옵션 5: pending 기부를 completed로 변경
-- ============================================

-- 5-1. pending 기부를 completed로 업데이트 (삭제 대신)
UPDATE donations
SET status = 'completed'
WHERE status = 'pending'
  AND user_id IN (
    SELECT id FROM users WHERE discord_id = '1340338561899303005'
  );

-- 5-2. 결과 확인
SELECT
  u.discord_username,
  d.status,
  d.amount,
  d.created_at
FROM donations d
JOIN users u ON d.user_id = u.id
WHERE u.discord_id = '1340338561899303005'
ORDER BY d.created_at DESC;

-- ============================================
-- 실행 순서 (권장)
-- ============================================

/*
1. 먼저 옵션 4로 현재 데이터 확인
2. 옵션 1 또는 옵션 3으로 데이터 삭제
3. 다시 옵션 4로 삭제 결과 확인
4. 프론트엔드에서 새 데이터 생성 테스트
*/

-- ============================================
-- 빠른 테스트용 스크립트
-- ============================================

-- 본인의 모든 POW 세션과 기부 데이터만 삭제 (사용자 계정은 유지)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 사용자 ID 가져오기
  SELECT id INTO v_user_id
  FROM users
  WHERE discord_id = '1340338561899303005';

  -- 세션 삭제
  DELETE FROM study_sessions WHERE user_id = v_user_id;

  -- 기부 삭제
  DELETE FROM donations WHERE user_id = v_user_id;

  -- 적립액 삭제
  DELETE FROM accumulated_sats WHERE user_id = v_user_id;

  -- 결과 출력
  RAISE NOTICE 'User % data deleted successfully', v_user_id;
END $$;

-- 확인
SELECT
  u.discord_username,
  (SELECT COUNT(*) FROM study_sessions WHERE user_id = u.id) as sessions,
  (SELECT COUNT(*) FROM donations WHERE user_id = u.id) as donations,
  (SELECT COUNT(*) FROM accumulated_sats WHERE user_id = u.id) as accumulated
FROM users u
WHERE u.discord_id = '1340338561899303005';
