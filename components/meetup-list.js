/**
 * MeetupList Component
 * Meet-up 목록을 렌더링하고 관리하는 컴포넌트
 */
class MeetupList {
  constructor(container, options = {}) {
    this.container = container;
    this.status = options.status || 'scheduled';
    this.currentUser = options.currentUser || null;
    this.onJoin = options.onJoin || null;
    this.onView = options.onView || null;
    this.meetups = [];
  }

  /**
   * Meet-up 목록 가져오기
   */
  async fetchMeetups() {
    try {
      const response = await MeetupAPI.list(this.status, 20);
      if (response.success) {
        this.meetups = response.data || [];
        return this.meetups;
      }
      throw new Error(response.error || '목록을 가져올 수 없습니다');
    } catch (error) {
      console.error('Meet-up 목록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  /**
   * 분야 이름 변환
   */
  getCategoryName(mode) {
    const categoryMap = {
      'pow-writing': '✒️ 글쓰기',
      'pow-music': '🎵 음악',
      'pow-study': '📝 공부',
      'pow-art': '🎨 그림',
      'pow-reading': '📚 독서',
      'pow-service': '✝️ 봉사',
    };
    return categoryMap[mode] || mode;
  }

  /**
   * 상태 텍스트 변환
   */
  getStatusText(status) {
    const statusMap = {
      scheduled: '예정됨',
      in_progress: '진행중',
      completed: '완료됨',
      cancelled: '취소됨',
    };
    return statusMap[status] || status;
  }

  /**
   * 사용자가 이미 참여했는지 확인
   */
  isUserParticipating(meetup) {
    if (!this.currentUser) return false;
    // 이 정보는 상세 조회에서만 가능하므로, 여기서는 false 반환
    // 나중에 상세 조회 후 버튼 상태 업데이트 가능
    return false;
  }

  /**
   * Meet-up 카드 렌더링
   */
  renderCard(meetup) {
    const {
      id,
      title,
      description,
      image_url,
      donation_mode,
      scheduled_at,
      duration_minutes,
      target_donation_amount,
      status,
      organizer,
      participant_count,
      total_pledged,
    } = meetup;

    const card = document.createElement('div');
    card.className = 'meetup-card';
    card.dataset.meetupId = id;

    // 이미지 URL 또는 기본 그라데이션
    const imageHtml = image_url
      ? `<img src="${image_url}" alt="${title}" class="meetup-card-image" />`
      : `<div class="meetup-card-image"></div>`;

    // 참여 버튼 표시 여부 (scheduled 또는 in_progress 상태)
    const canJoin = status === 'scheduled' || status === 'in_progress';
    const joinButtonHtml = canJoin && this.currentUser
      ? `<button type="button" class="btn btn-primary join-btn" data-meetup-id="${id}">참여하기</button>`
      : '';

    card.innerHTML = `
      ${imageHtml}
      <div class="meetup-card-content">
        <h3 class="meetup-card-title">${title}</h3>
        ${description ? `<p class="meetup-card-description">${description}</p>` : ''}

        <div class="meetup-card-meta">
          <div class="meetup-card-meta-row">
            <span>📅 ${this.formatDate(scheduled_at)}</span>
          </div>
          <div class="meetup-card-meta-row">
            <span>⏱️ ${duration_minutes}분</span>
            <span>•</span>
            <span>${this.getCategoryName(donation_mode)}</span>
          </div>
          <div class="meetup-card-meta-row">
            <span>👤 ${organizer.discord_username}</span>
          </div>
        </div>

        <div class="meetup-card-stats">
          <div class="meetup-stat">
            <span class="meetup-stat-label">참여자</span>
            <span class="meetup-stat-value">${participant_count}명</span>
          </div>
          <div class="meetup-stat">
            <span class="meetup-stat-label">약속 금액</span>
            <span class="meetup-stat-value">${total_pledged} sats</span>
          </div>
        </div>

        <div class="meetup-card-meta-row" style="margin-top: 12px;">
          <span class="meetup-status-badge ${status}">${this.getStatusText(status)}</span>
          <span style="flex: 1;"></span>
          <span style="color: #94a3b8; font-size: 12px;">목표: ${target_donation_amount} sats</span>
        </div>

        ${joinButtonHtml || this.currentUser ? `
          <div class="meetup-card-actions">
            ${joinButtonHtml}
            <button type="button" class="btn btn-secondary view-details-btn" data-meetup-id="${id}">자세히 보기</button>
          </div>
        ` : ''}
      </div>
    `;

    // 이벤트 리스너 추가
    const joinBtn = card.querySelector('.join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onJoin) {
          this.onJoin(id);
        }
      });
    }

    const viewBtn = card.querySelector('.view-details-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onView) {
          this.onView(id);
        }
      });
    }

    // 카드 전체 클릭 시 상세 보기
    card.addEventListener('click', () => {
      if (this.onView) {
        this.onView(id);
      }
    });

    return card;
  }

  /**
   * 전체 목록 렌더링
   */
  async render() {
    try {
      // 로딩 상태 표시
      const loadingEl = document.getElementById('loading-state');
      const emptyEl = document.getElementById('empty-state');
      const gridEl = document.getElementById('meetups-grid');

      if (loadingEl) loadingEl.classList.remove('hidden');
      if (emptyEl) emptyEl.classList.add('hidden');
      if (gridEl) gridEl.classList.add('hidden');

      // 데이터 가져오기
      await this.fetchMeetups();

      // 로딩 상태 숨기기
      if (loadingEl) loadingEl.classList.add('hidden');

      // 결과가 없으면 빈 상태 표시
      if (this.meetups.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
      }

      // 그리드 표시 및 렌더링
      if (gridEl) {
        gridEl.classList.remove('hidden');
        gridEl.innerHTML = '';
        this.meetups.forEach((meetup) => {
          const card = this.renderCard(meetup);
          gridEl.appendChild(card);
        });
      }
    } catch (error) {
      console.error('렌더링 오류:', error);
      const loadingEl = document.getElementById('loading-state');
      if (loadingEl) {
        loadingEl.textContent = '목록을 불러올 수 없습니다.';
        loadingEl.classList.remove('hidden');
      }
    }
  }

  /**
   * 상태 변경 및 재렌더링
   */
  async changeStatus(newStatus) {
    this.status = newStatus;
    await this.render();
  }

  /**
   * 현재 사용자 설정
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }
}
