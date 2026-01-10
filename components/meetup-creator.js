/**
 * MeetupCreator Component
 * Organizer가 Meet-up을 생성하는 폼 컴포넌트
 */
class MeetupCreator {
  constructor(container, options = {}) {
    this.container = container;
    this.currentUser = options.currentUser || null;
    this.onSuccess = options.onSuccess || null;
    this.onCancel = options.onCancel || null;
    this.uploadedImageUrl = null;
  }

  /**
   * 이미지 파일을 base64로 변환
   */
  async readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 이미지 업로드 처리
   */
  async handleImageUpload(file) {
    try {
      if (!file) return null;

      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('이미지 크기는 5MB 이하여야 합니다.');
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
      }

      // base64로 변환
      const dataUrl = await this.readFileAsDataUrl(file);
      return dataUrl;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 이미지 미리보기 업데이트
   */
  updateImagePreview(dataUrl) {
    const previewEl = this.container.querySelector('#image-preview');
    const placeholderEl = this.container.querySelector('#image-placeholder');

    if (dataUrl) {
      if (previewEl) {
        previewEl.src = dataUrl;
        previewEl.classList.remove('hidden');
      }
      if (placeholderEl) {
        placeholderEl.classList.add('hidden');
      }
      this.uploadedImageUrl = dataUrl;
    } else {
      if (previewEl) {
        previewEl.classList.add('hidden');
      }
      if (placeholderEl) {
        placeholderEl.classList.remove('hidden');
      }
      this.uploadedImageUrl = null;
    }
  }

  /**
   * 폼 제출 처리
   */
  async handleSubmit(formData) {
    try {
      if (!this.currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      // 필수 필드 검증
      if (!formData.title || !formData.scheduled_at || !formData.duration_minutes || !formData.target_donation_amount) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      // Meet-up 생성
      const meetupData = {
        roles: this.currentUser.roles || [], // Discord role IDs for authorization check
        title: formData.title,
        description: formData.description || null,
        image_url: this.uploadedImageUrl || null,
        donation_mode: formData.donation_mode || 'pow-writing',
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        target_donation_amount: parseInt(formData.target_donation_amount),
      };

      const response = await MeetupAPI.create(this.currentUser.discord_id, meetupData);

      if (response.success) {
        if (this.onSuccess) {
          this.onSuccess(response.data);
        }
        return response.data;
      }

      throw new Error(response.error || 'Meet-up 생성에 실패했습니다.');
    } catch (error) {
      console.error('Meet-up 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 렌더링
   */
  render() {
    this.container.innerHTML = `
      <div class="meetup-creator-form">
        <h2>Meet-up 개최하기</h2>
        <form id="meetup-form">
          <!-- 이미지 업로드 -->
          <div class="form-group">
            <label for="meetup-image">대표 이미지</label>
            <div class="image-upload-container" style="margin-bottom: 12px;">
              <div id="image-placeholder" style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                이미지를 선택하세요 (선택사항)
              </div>
              <img id="image-preview" class="hidden" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" />
            </div>
            <input
              type="file"
              id="meetup-image"
              accept="image/*"
              class="form-control"
            />
            <p class="form-hint">권장 크기: 16:9 비율, 최대 5MB</p>
          </div>

          <!-- 제목 -->
          <div class="form-group">
            <label for="meetup-title">제목 *</label>
            <input
              type="text"
              id="meetup-title"
              name="title"
              required
              maxlength="200"
              placeholder="예: Bitcoin 스터디 모임"
            />
          </div>

          <!-- 설명 -->
          <div class="form-group">
            <label for="meetup-description">활동 내용</label>
            <textarea
              id="meetup-description"
              name="description"
              rows="4"
              placeholder="활동 내용을 자유롭게 작성해주세요."
            ></textarea>
          </div>

          <!-- 분야 -->
          <div class="form-group">
            <label for="meetup-category">분야 *</label>
            <select id="meetup-category" name="donation_mode" required>
              <option value="pow-writing">✒️ 글쓰기</option>
              <option value="pow-music">🎵 음악</option>
              <option value="pow-study">📝 공부</option>
              <option value="pow-art">🎨 그림</option>
              <option value="pow-reading">📚 독서</option>
              <option value="pow-service">✝️ 봉사</option>
            </select>
          </div>

          <!-- 일시 -->
          <div class="form-group">
            <label for="meetup-datetime">일시 *</label>
            <input
              type="datetime-local"
              id="meetup-datetime"
              name="scheduled_at"
              required
            />
            <p class="form-hint">Meet-up이 시작되는 날짜와 시간을 선택하세요.</p>
          </div>

          <!-- 활동 시간 -->
          <div class="form-group">
            <label for="meetup-duration">활동 시간 (분) *</label>
            <input
              type="number"
              id="meetup-duration"
              name="duration_minutes"
              required
              min="1"
              placeholder="예: 120"
            />
            <p class="form-hint">예상 활동 시간을 분 단위로 입력하세요.</p>
          </div>

          <!-- 목표 기부금액 -->
          <div class="form-group">
            <label for="meetup-target">목표 기부금액 (sats) *</label>
            <input
              type="number"
              id="meetup-target"
              name="target_donation_amount"
              required
              min="1"
              placeholder="예: 100"
            />
            <p class="form-hint">참여자들의 총 기부 목표 금액을 입력하세요.</p>
          </div>

          <!-- 버튼 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">취소</button>
            <button type="submit" class="btn btn-primary" id="submit-btn">생성하기</button>
          </div>
        </form>
      </div>
    `;

    // 이벤트 리스너 추가
    const form = this.container.querySelector('#meetup-form');
    const imageInput = this.container.querySelector('#meetup-image');
    const cancelBtn = this.container.querySelector('#cancel-btn');
    const submitBtn = this.container.querySelector('#submit-btn');

    // 이미지 업로드
    if (imageInput) {
      imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const dataUrl = await this.handleImageUpload(file);
            this.updateImagePreview(dataUrl);
          } catch (error) {
            alert(error.message);
            e.target.value = '';
          }
        }
      });
    }

    // 취소 버튼
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) {
          this.onCancel();
        }
      });
    }

    // 폼 제출
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '생성 중...';
        }

        try {
          const formData = {
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            donation_mode: form.donation_mode.value,
            scheduled_at: form.scheduled_at.value,
            duration_minutes: form.duration_minutes.value,
            target_donation_amount: form.target_donation_amount.value,
          };

          await this.handleSubmit(formData);

          // 성공 메시지
          alert('Meet-up이 성공적으로 생성되었습니다!');

          // 폼 초기화
          form.reset();
          this.updateImagePreview(null);
        } catch (error) {
          alert(error.message || 'Meet-up 생성에 실패했습니다.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '생성하기';
          }
        }
      });
    }
  }

  /**
   * 현재 사용자 설정
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * 표시
   */
  show() {
    this.container.classList.remove('hidden');
    this.render();
  }

  /**
   * 숨기기
   */
  hide() {
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }
}
