/**
 * DonationPopup Component
 * 활동 완료 후 기부를 유도하는 팝업 컴포넌트
 */
class DonationPopup {
  constructor(container, pendingDonations, currentUser, options = {}) {
    this.container = container;
    this.pendingDonations = pendingDonations;
    this.currentUser = currentUser;
    this.onSuccess = options.onSuccess || null;
    this.currentIndex = 0;
  }

  /**
   * 기부 완료 처리
   */
  async handleDonation(meetupId, amount) {
    try {
      if (!this.currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!amount || amount < 1) {
        throw new Error('유효한 금액을 입력해주세요.');
      }

      // 백엔드 API 호출
      const response = await MeetupAPI.completeDonation(
        meetupId,
        this.currentUser.discord_id,
        amount
      );

      if (!response.success) {
        throw new Error(response.error || '기부에 실패했습니다.');
      }

      return response.data;
    } catch (error) {
      console.error('기부 처리 오류:', error);
      throw error;
    }
  }

  /**
   * 현재 기부 건 렌더링
   */
  renderCurrent() {
    if (this.currentIndex >= this.pendingDonations.length) {
      // 모든 기부 처리 완료
      this.container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h2 style="margin-bottom: 12px;">모든 기부를 완료했습니다!</h2>
          <p style="color: #64748b;">소중한 참여 감사합니다.</p>
          <button type="button" class="btn btn-primary" id="close-popup-btn" style="margin-top: 20px;">
            닫기
          </button>
        </div>
      `;

      const closeBtn = this.container.querySelector('#close-popup-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hide();
          if (this.onSuccess) {
            this.onSuccess();
          }
        });
      }

      return;
    }

    const donation = this.pendingDonations[this.currentIndex];
    const {
      meetup_id,
      title,
      image_url,
      pledged_amount,
      completed_at,
    } = donation;

    this.container.innerHTML = `
      <div class="donation-popup-content">
        ${image_url ? `
          <img
            src="${image_url}"
            alt="${title}"
            style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;"
          />
        ` : ''}

        <h2 style="margin-bottom: 8px;">${title}</h2>
        <p style="color: #64748b; margin-bottom: 20px;">
          활동을 완료하셨습니다! 약속하신 금액을 기부해주세요.
        </p>

        <form id="donation-form">
          <div class="form-group">
            <label for="donation-amount">기부 금액 (sats)</label>
            <input
              type="number"
              id="donation-amount"
              name="amount"
              min="1"
              value="${pledged_amount}"
              required
              placeholder="예: ${pledged_amount}"
            />
            <p class="form-hint">약속 금액: ${pledged_amount} sats (수정 가능)</p>
          </div>

          <div class="form-actions" style="margin-top: 20px;">
            <button type="button" class="btn btn-secondary" id="skip-btn">
              나중에
            </button>
            <button type="submit" class="btn btn-primary" id="donate-btn">
              기부하기
            </button>
          </div>
        </form>

        ${this.pendingDonations.length > 1 ? `
          <div style="text-align: center; margin-top: 16px; color: #94a3b8; font-size: 13px;">
            ${this.currentIndex + 1} / ${this.pendingDonations.length}
          </div>
        ` : ''}
      </div>
    `;

    // 폼 이벤트
    const form = this.container.querySelector('#donation-form');
    const skipBtn = this.container.querySelector('#skip-btn');
    const donateBtn = this.container.querySelector('#donate-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = parseInt(form.amount.value);

        if (donateBtn) {
          donateBtn.disabled = true;
          donateBtn.textContent = '기부 중...';
        }

        try {
          await this.handleDonation(meetup_id, amount);

          alert('기부가 완료되었습니다! 감사합니다 🙏');

          // 다음 기부로 이동
          this.currentIndex++;
          this.renderCurrent();
        } catch (error) {
          alert(error.message || '기부에 실패했습니다.');
          if (donateBtn) {
            donateBtn.disabled = false;
            donateBtn.textContent = '기부하기';
          }
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        // 다음 기부로 이동
        this.currentIndex++;
        this.renderCurrent();
      });
    }
  }

  /**
   * 표시
   */
  show() {
    if (!this.pendingDonations || this.pendingDonations.length === 0) {
      console.log('미완료 기부가 없습니다.');
      return;
    }

    this.currentIndex = 0;
    this.renderCurrent();

    // 모달 표시
    const modal = this.container.closest('.modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  /**
   * 숨기기
   */
  hide() {
    const modal = this.container.closest('.modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.container.innerHTML = '';
  }
}
