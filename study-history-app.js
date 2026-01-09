// Citadel POW 대시보드 - study-history.html 전용 스크립트

const powCategoryFilter = document.getElementById("pow-category-filter");
const myRecordsTab = document.getElementById("my-records-tab");
const popularRecordsTab = document.getElementById("popular-records-tab");
const tabButtons = document.querySelectorAll(".toggle-button[data-tab]");

const myStudyLeaderboard = document.getElementById("my-study-leaderboard");
const popularLeaderboard = document.getElementById("popular-leaderboard");
const studyDateSelect = document.getElementById("study-date-select");
const studyHistoryDate = document.getElementById("study-history-date");
const studyHistoryEmpty = document.getElementById("study-history-empty");
const popularRecordsList = document.getElementById("popular-records-list");
const popularRecordsEmpty = document.getElementById("popular-records-empty");

// Carousel 요소
const carouselContainer = document.getElementById("pow-carousel-container");
const carouselTrack = document.getElementById("carousel-track");
const carouselPrev = document.getElementById("carousel-prev");
const carouselNext = document.getElementById("carousel-next");
const carouselIndicator = document.getElementById("carousel-indicator");

let currentTab = "my-records";
let currentCategory = "all";
let currentUser = null;
let currentSessions = [];
let currentIndex = 0;
let currentSessionsByDate = {}; // 날짜별 세션 저장

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
    let filteredSessions;
    if (currentCategory === "all") {
      filteredSessions = sessions;
    } else {
      const selectedEmoji = getCategoryLabel(currentCategory);
      // 모든 카테고리 이모지 목록
      const allEmojis = ["✒️", "🎵", "📝", "🎨", "📚", "✝️"];

      filteredSessions = sessions.filter(s => {
        if (!s.plan_text) return false;

        // 선택한 카테고리 이모지가 포함되어 있으면 표시
        if (s.plan_text.includes(selectedEmoji)) return true;

        // 다른 카테고리 이모지가 하나라도 있으면 제외
        const hasOtherEmoji = allEmojis.some(emoji =>
          emoji !== selectedEmoji && s.plan_text.includes(emoji)
        );
        if (hasOtherEmoji) return false;

        // 어떤 카테고리 이모지도 없는 경우 (구 데이터): 모든 카테고리에 표시
        return true;
      });
    }

    // 날짜별 그룹화
    currentSessionsByDate = {};
    filteredSessions.forEach(session => {
      const date = session.created_at.split('T')[0];
      if (!currentSessionsByDate[date]) {
        currentSessionsByDate[date] = [];
      }
      currentSessionsByDate[date].push(session);
    });

    // 날짜 선택 옵션 렌더링
    const dates = Object.keys(currentSessionsByDate).sort().reverse();
    studyDateSelect.innerHTML = dates
      .map(date => `<option value="${date}">${date}</option>`)
      .join("");

    if (dates.length > 0) {
      studyDateSelect.value = dates[0];
      studyHistoryEmpty.classList.add("hidden");
      renderSessionsForDate(dates[0], currentSessionsByDate);
    } else {
      studyDateSelect.innerHTML = '<option value="">날짜 없음</option>';
      carouselContainer.classList.add("hidden");
      studyHistoryEmpty.classList.remove("hidden");
      studyHistoryEmpty.textContent = "아직 POW 기록이 없습니다.";
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

// 선택한 날짜의 세션 렌더링 (Carousel)
const renderSessionsForDate = (date, sessionsByDate) => {
  studyHistoryDate.textContent = date;
  const sessions = sessionsByDate[date] || [];

  if (sessions.length === 0) {
    carouselContainer.classList.add("hidden");
    studyHistoryEmpty.classList.remove("hidden");
    return;
  }

  studyHistoryEmpty.classList.add("hidden");
  carouselContainer.classList.remove("hidden");
  currentSessions = sessions;
  currentIndex = 0;
  renderCarousel();
};

// Carousel 렌더링
const renderCarousel = () => {
  if (currentSessions.length === 0) return;

  // 카드 렌더링
  carouselTrack.innerHTML = currentSessions
    .map((session, index) => {
      const photoUrl = session.photo_url;
      const minutes = session.duration_minutes || 0;
      const plan = session.plan_text || "계획 없음";

      if (photoUrl && photoUrl !== "data:,") {
        // 인증카드 이미지가 있으면 이미지 표시
        return `
          <div class="carousel-card ${index === currentIndex ? 'active' : ''}" data-index="${index}">
            <img src="${photoUrl}" alt="POW 인증카드" class="pow-badge-image" />
          </div>
        `;
      } else {
        // 인증카드 이미지가 없으면 텍스트 표시
        return `
          <div class="carousel-card ${index === currentIndex ? 'active' : ''}" data-index="${index}">
            <div class="pow-text-card">
              <div class="pow-text-time">${minutes}분</div>
              <div class="pow-text-plan">${plan}</div>
            </div>
          </div>
        `;
      }
    })
    .join("");

  // 인디케이터 렌더링
  carouselIndicator.textContent = `${currentIndex + 1} / ${currentSessions.length}`;

  // 버튼 상태 업데이트
  carouselPrev.disabled = currentIndex === 0;
  carouselNext.disabled = currentIndex === currentSessions.length - 1;

  // 슬라이드 위치 업데이트
  updateCarouselPosition();
};

// Carousel 위치 업데이트
const updateCarouselPosition = () => {
  const offset = -currentIndex * 100;
  carouselTrack.style.transform = `translateX(${offset}%)`;
};

// 이전 카드로 이동
const showPrevCard = () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderCarousel();
  }
};

// 다음 카드로 이동
const showNextCard = () => {
  if (currentIndex < currentSessions.length - 1) {
    currentIndex++;
    renderCarousel();
  }
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

// 터치 스와이프 지원
let touchStartX = 0;
let touchEndX = 0;

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
};

const handleSwipe = () => {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // 왼쪽으로 스와이프 = 다음 카드
      showNextCard();
    } else {
      // 오른쪽으로 스와이프 = 이전 카드
      showPrevCard();
    }
  }
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
  // 현재 로드된 currentSessionsByDate 사용
  if (date && currentSessionsByDate[date]) {
    renderSessionsForDate(date, currentSessionsByDate);
  }
});

// Carousel 버튼 이벤트
carouselPrev?.addEventListener("click", showPrevCard);
carouselNext?.addEventListener("click", showNextCard);

// 터치 스와이프 이벤트
carouselContainer?.addEventListener("touchstart", handleTouchStart, false);
carouselContainer?.addEventListener("touchend", handleTouchEnd, false);

// 키보드 화살표 이벤트
document.addEventListener("keydown", (e) => {
  if (carouselContainer && !carouselContainer.classList.contains("hidden")) {
    if (e.key === "ArrowLeft") {
      showPrevCard();
    } else if (e.key === "ArrowRight") {
      showNextCard();
    }
  }
});

// 초기화
(async () => {
  await loadSession();
  renderMyRecords();
})();
