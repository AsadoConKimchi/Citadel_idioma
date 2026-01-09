// Citadel POW 대시보드 - study-history.html 전용 스크립트

const powCategoryFilter = document.getElementById("pow-category-filter");
const myRecordsTab = document.getElementById("my-records-tab");
const popularRecordsTab = document.getElementById("popular-records-tab");
const tabButtons = document.querySelectorAll(".toggle-button[data-tab]");

const myStudyLeaderboard = document.getElementById("my-study-leaderboard");
const popularLeaderboard = document.getElementById("popular-leaderboard");
const studyDateSelect = document.getElementById("study-date-select");
const studyHistoryDate = document.getElementById("study-history-date");
const studyHistoryList = document.getElementById("study-history-list");
const studyHistoryEmpty = document.getElementById("study-history-empty");
const popularRecordsList = document.getElementById("popular-records-list");
const popularRecordsEmpty = document.getElementById("popular-records-empty");

let currentTab = "my-records";
let currentCategory = "all";
let currentUser = null;

// 세션 정보 로드
const loadSession = async () => {
  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      console.log("로그인된 사용자:", currentUser.username);
    }
  } catch (error) {
    console.error("세션 로드 실패:", error);
  }
};

// 탭 전환
const switchTab = (tabName) => {
  currentTab = tabName;

  // 탭 버튼 활성화 상태 변경
  tabButtons.forEach((button) => {
    if (button.dataset.tab === tabName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  // 탭 컨텐츠 표시/숨김
  if (tabName === "my-records") {
    myRecordsTab.classList.remove("hidden");
    myRecordsTab.classList.add("active");
    popularRecordsTab.classList.add("hidden");
    popularRecordsTab.classList.remove("active");
    renderMyRecords();
  } else if (tabName === "popular-records") {
    myRecordsTab.classList.add("hidden");
    myRecordsTab.classList.remove("active");
    popularRecordsTab.classList.remove("hidden");
    popularRecordsTab.classList.add("active");
    renderPopularRecords();
  }
};

// 나의 기록 렌더링
const renderMyRecords = async () => {
  if (!currentUser) {
    myStudyLeaderboard.innerHTML = '<li class="hint">로그인이 필요합니다.</li>';
    return;
  }

  try {
    // API에서 나의 POW 세션 가져오기
    const response = await StudySessionAPI.getByUser(currentUser.id, 100);
    if (!response.success) {
      myStudyLeaderboard.innerHTML = '<li class="hint">데이터를 불러올 수 없습니다.</li>';
      return;
    }

    const sessions = response.data || [];

    // 카테고리 필터링
    const filteredSessions = currentCategory === "all"
      ? sessions
      : sessions.filter(s => s.plan_text && s.plan_text.includes(getCategoryLabel(currentCategory)));

    // 날짜별 그룹화
    const sessionsByDate = {};
    filteredSessions.forEach(session => {
      const date = session.created_at.split('T')[0];
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push(session);
    });

    // 날짜 선택 옵션 렌더링
    const dates = Object.keys(sessionsByDate).sort().reverse();
    studyDateSelect.innerHTML = dates
      .map(date => `<option value="${date}">${date}</option>`)
      .join("");

    if (dates.length > 0) {
      studyDateSelect.value = dates[0];
      renderSessionsForDate(dates[0], sessionsByDate);
    } else {
      studyHistoryList.innerHTML = "";
      studyHistoryEmpty.classList.remove("hidden");
    }

    // 누적 시간 계산
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    myStudyLeaderboard.innerHTML = `
      <li>
        <span>${currentUser.username}</span>
        <span>${totalHours}시간 ${remainingMinutes}분</span>
      </li>
    `;
  } catch (error) {
    console.error("나의 기록 로드 실패:", error);
    myStudyLeaderboard.innerHTML = '<li class="hint">데이터를 불러올 수 없습니다.</li>';
  }
};

// 선택한 날짜의 세션 렌더링
const renderSessionsForDate = (date, sessionsByDate) => {
  studyHistoryDate.textContent = date;
  const sessions = sessionsByDate[date] || [];

  if (sessions.length === 0) {
    studyHistoryList.innerHTML = "";
    studyHistoryEmpty.classList.remove("hidden");
    return;
  }

  studyHistoryEmpty.classList.add("hidden");
  studyHistoryList.innerHTML = sessions
    .map(session => {
      const minutes = session.duration_minutes || 0;
      const plan = session.plan_text || "계획 없음";
      return `
        <div class="session-item">
          <div class="session-time">${minutes}분</div>
          <div class="session-plan">${plan}</div>
        </div>
      `;
    })
    .join("");
};

// 인기 기록 렌더링 (디스코드 반응 수 기준)
const renderPopularRecords = async () => {
  try {
    // TODO: 백엔드 API에서 디스코드 반응 수 데이터 가져오기
    // 현재는 임시 데이터 표시
    popularLeaderboard.innerHTML = `
      <li class="hint">디스코드 반응 수 집계 기능은 준비 중입니다.</li>
    `;
    popularRecordsList.innerHTML = "";
    popularRecordsEmpty.classList.remove("hidden");
  } catch (error) {
    console.error("인기 기록 로드 실패:", error);
    popularLeaderboard.innerHTML = '<li class="hint">데이터를 불러올 수 없습니다.</li>';
  }
};

// 카테고리 라벨 가져오기
const getCategoryLabel = (category) => {
  const labels = {
    "pow-writing": "✒️",
    "pow-music": "🎵",
    "pow-study": "📝",
    "pow-art": "🎨",
    "pow-reading": "📚",
    "pow-service": "✝️",
  };
  return labels[category] || "";
};

// 이벤트 리스너
tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
  });
});

powCategoryFilter?.addEventListener("change", (e) => {
  currentCategory = e.target.value;
  if (currentTab === "my-records") {
    renderMyRecords();
  } else {
    renderPopularRecords();
  }
});

studyDateSelect?.addEventListener("change", (e) => {
  const date = e.target.value;
  // 현재 로드된 sessionsByDate 재사용 필요
  // 간단하게 재렌더링
  renderMyRecords();
});

// 초기화
(async () => {
  await loadSession();
  renderMyRecords();
})();
