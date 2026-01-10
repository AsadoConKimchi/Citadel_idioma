# 테스트 데이터 삭제 및 재테스트 가이드

**작성일**: 2026-01-10
**목적**: 기존 잘못된 데이터 삭제 후 새 데이터로 재테스트

---

## 📋 테스트 프로세스

1. ✅ 백엔드 수정 완료 (discord_id 추가)
2. 🔄 **기존 데이터 삭제** ← 지금 여기
3. 🧪 새 데이터 생성 및 테스트
4. ✅ 정상 작동 확인

---

## 🗑️ 1단계: Supabase에서 데이터 삭제

### 방법 1: Supabase Dashboard 사용 (가장 쉬움)

1. **Supabase 대시보드 접속**
   - https://app.supabase.com/ 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **SQL 스크립트 실행**
   - `TEST_DATA_CLEANUP.sql` 파일 내용 복사
   - 아래 스크립트 중 선택하여 실행:

#### 옵션 A: 본인 데이터만 삭제 (권장)

```sql
-- 1. 먼저 본인의 Discord ID 확인
SELECT id, discord_id, discord_username
FROM users
WHERE discord_id = '1340338561899303005';

-- 2. 본인의 세션 삭제
DELETE FROM study_sessions
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 3. 본인의 기부 삭제
DELETE FROM donations
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 4. 본인의 적립액 삭제
DELETE FROM accumulated_sats
WHERE user_id IN (
  SELECT id FROM users WHERE discord_id = '1340338561899303005'
);

-- 5. 결과 확인
SELECT
  u.discord_username,
  (SELECT COUNT(*) FROM study_sessions WHERE user_id = u.id) as sessions,
  (SELECT COUNT(*) FROM donations WHERE user_id = u.id) as donations
FROM users u
WHERE u.discord_id = '1340338561899303005';
```

**예상 결과**:
```
discord_username | sessions | donations
-----------------+----------+-----------
A⚡ado 🌽 Kimchi |    0     |     0
```

#### 옵션 B: 잘못된 데이터만 삭제

```sql
-- duration_minutes가 0인 세션만 삭제
DELETE FROM study_sessions WHERE duration_minutes = 0;

-- pending 상태인 기부만 삭제
DELETE FROM donations WHERE status = 'pending';
```

#### 옵션 C: pending 기부를 completed로 변경 (삭제 대신)

```sql
UPDATE donations
SET status = 'completed'
WHERE status = 'pending'
  AND user_id IN (
    SELECT id FROM users WHERE discord_id = '1340338561899303005'
  );
```

4. **"Run" 버튼 클릭**하여 실행

---

## 🧪 2단계: 새 데이터 생성 및 테스트

### A. POW 세션 테스트

1. **프론트엔드 접속**
   - https://asadoconkimchi.github.io/Citadel_POW/

2. **POW 타이머 실행**
   - 분야 선택 (예: 글쓰기)
   - 목표 시간 설정 (예: 5분)
   - "시작" 버튼 클릭
   - **5분 기다리기** (또는 1분이라도)
   - "종료" 버튼 클릭

3. **인증 카드 생성**
   - 계획 입력
   - 사진 업로드 또는 촬영
   - "인증 완료" 버튼 클릭

4. **세션 저장 확인**
   ```bash
   curl "https://citadel-pow-backend.magadenuevo2025.workers.dev/api/study-sessions/user/1340338561899303005?limit=1"
   ```

   **기대 결과**:
   ```json
   {
     "duration_minutes": 5,  // ← 0이 아닌 실제 값!
     "donation_mode": "pow-writing",
     "plan_text": "테스트"
   }
   ```

### B. 기부 테스트

1. **사토시 기부**
   - "즉시 기부" 또는 "적립 후 기부" 선택
   - 금액 입력 (예: 10 sats)
   - "기부하기" 버튼 클릭

2. **기부 저장 확인**
   ```bash
   curl "https://citadel-pow-backend.magadenuevo2025.workers.dev/api/donations/user/1340338561899303005"
   ```

   **기대 결과**:
   ```json
   {
     "amount": 10,
     "status": "completed",  // ← pending이 아닌 completed!
     "donation_mode": "pow-writing"
   }
   ```

---

## ✅ 3단계: 대시보드 확인

### A. Citadel POW 탭 확인

1. **POW 시간 대시보드**
   - https://asadoconkimchi.github.io/Citadel_POW/study-history.html
   - "대시보드" 탭 클릭
   - "POW 시간" 선택

   **기대 결과**: 본인의 POW 시간이 **5분** (또는 실제 시간)으로 표시됨

2. **API 직접 확인**
   ```bash
   curl "https://citadel-pow-backend.magadenuevo2025.workers.dev/api/rankings/by-category?type=time&category=all&limit=10"
   ```

   **기대 결과**:
   ```json
   {
     "rank": 1,
     "discord_username": "A⚡ado 🌽 Kimchi",
     "total_minutes": 5,  // ← 0이 아님!
     "session_count": 1
   }
   ```

### B. Donation 탭 확인

1. **누적 기부액 TOP 5**
   - https://asadoconkimchi.github.io/Citadel_POW/donation-history.html

   **기대 결과**:
   - 프로필 사진 정상 표시 (또는 색상 원)
   - 누적 기부액: **10 sats** (또는 실제 금액)

2. **API 직접 확인**
   ```bash
   curl "https://citadel-pow-backend.magadenuevo2025.workers.dev/api/donations/top?category=all&limit=5"
   ```

   **기대 결과**:
   ```json
   {
     "discord_id": "1340338561899303005",  // ✅ 있음
     "discord_username": "A⚡ado 🌽 Kimchi",
     "discord_avatar": "f747b19434ea55fc4d0bde6ae725669c",
     "total_donated": 10  // ✅ 정확한 금액
   }
   ```

### C. 나의 POW 탭 확인

1. **나의 POW 기록**
   - https://asadoconkimchi.github.io/Citadel_POW/my-pow-records.html
   - 분야/날짜/기간 필터 테스트

   **기대 결과**:
   - 총 POW 시간: **5분** (또는 실제 시간)
   - 세션 수: **1개**
   - 인증카드 표시됨

---

## 🐛 문제 해결

### 문제 1: 세션이 저장되지 않음

**증상**: API에서 데이터가 안 보임

**해결**:
1. 브라우저 콘솔 확인 (F12)
2. Network 탭에서 API 요청 확인
3. 에러 메시지 확인

### 문제 2: duration_minutes가 여전히 0

**원인**: 프론트엔드 app.js에서 duration_minutes 계산 오류

**확인**:
```bash
# app.js 파일에서 duration_minutes 계산 부분 확인
grep -n "duration_minutes" /Users/jinito/Citadel_POW/app.js
```

### 문제 3: 기부 status가 pending

**원인**: 프론트엔드에서 status='completed'로 설정 안 함

**해결**: app.js에서 기부 생성 시 `status: 'completed'` 추가

---

## 📊 테스트 체크리스트

### 데이터 삭제
- [ ] Supabase SQL Editor 접속
- [ ] 본인의 Discord ID 확인
- [ ] 세션 데이터 삭제 실행
- [ ] 기부 데이터 삭제 실행
- [ ] 삭제 결과 확인 (sessions=0, donations=0)

### 새 데이터 생성
- [ ] POW 타이머 실행 (최소 1분)
- [ ] 인증 완료
- [ ] 기부 실행
- [ ] API로 데이터 확인

### 대시보드 확인
- [ ] POW 시간 랭킹: total_minutes > 0
- [ ] 기부액 랭킹: total_donated > 0, discord_id 있음
- [ ] 프로필 사진 정상 표시
- [ ] 나의 POW 기록 표시됨

---

## 🎯 성공 기준

✅ **POW 시간**: 실제 타이머 시간이 대시보드에 정확히 표시됨
✅ **기부액**: 모든 기부 금액이 정확히 합산되어 표시됨
✅ **프로필 사진**: discord_id로 정상 표시 (또는 폴백)
✅ **필터링**: 분야/날짜/기간 필터가 정상 작동

---

**작성자**: Claude Code
**날짜**: 2026-01-10
