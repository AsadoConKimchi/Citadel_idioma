/**
 * QRGenerator Component
 * Organizer가 출석 확인용 QR 코드를 생성하는 컴포넌트
 */
class QRGenerator {
  constructor(container, meetupId, currentUser) {
    this.container = container;
    this.meetupId = meetupId;
    this.currentUser = currentUser;
    this.qrData = null;
  }

  /**
   * QR 코드 생성
   */
  async generateQR() {
    try {
      if (!this.currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      // 백엔드 API 호출
      const response = await MeetupAPI.generateQR(this.meetupId, this.currentUser.discord_id);

      if (!response.success) {
        throw new Error(response.error || 'QR 생성에 실패했습니다.');
      }

      this.qrData = {
        qr_code_url: response.data.qr_code_url,
        qr_data: response.data.qr_data,
        expires_at: response.data.expires_at,
      };

      return this.qrData;
    } catch (error) {
      console.error('QR 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 만료 시간 포맷팅
   */
  formatExpiryTime(expiresAt) {
    const date = new Date(expiresAt);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * QR 이미지 다운로드
   */
  async downloadQR() {
    if (!this.qrData) {
      alert('먼저 QR 코드를 생성해주세요.');
      return;
    }

    try {
      // QR 이미지를 fetch로 가져와서 다운로드
      const response = await fetch(this.qrData.qr_code_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `meetup-qr-${this.meetupId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('QR 다운로드 오류:', error);
      alert('QR 코드 다운로드에 실패했습니다.');
    }
  }

  /**
   * 렌더링
   */
  render(qrData = null) {
    // 전달받은 데이터가 있으면 사용
    if (qrData) {
      this.qrData = qrData;
    }

    if (!this.qrData) {
      // QR 생성 전 상태
      this.container.innerHTML = `
        <div class="qr-code-container">
          <div style="text-align: center; padding: 40px;">
            <p style="color: #64748b; margin-bottom: 20px;">
              참여자들의 출석을 확인하기 위한 QR 코드를 생성합니다.
            </p>
            <button type="button" class="btn btn-primary" id="generate-qr-action-btn">
              QR 코드 생성
            </button>
          </div>
        </div>
      `;

      const generateBtn = this.container.querySelector('#generate-qr-action-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
          generateBtn.disabled = true;
          generateBtn.textContent = '생성 중...';

          try {
            await this.generateQR();
            this.render(); // 재렌더링
          } catch (error) {
            alert(error.message || 'QR 생성에 실패했습니다.');
            generateBtn.disabled = false;
            generateBtn.textContent = 'QR 코드 생성';
          }
        });
      }

      return;
    }

    // QR 생성 후 상태
    const expiryTime = this.formatExpiryTime(this.qrData.expires_at);

    this.container.innerHTML = `
      <div class="qr-code-container">
        <h3 style="text-align: center; margin-bottom: 16px;">출석 확인 QR 코드</h3>

        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <img
            src="${this.qrData.qr_code_url}"
            alt="QR Code"
            class="qr-code-image"
            style="width: 100%; max-width: 300px; margin: 0 auto; display: block;"
          />
        </div>

        <div class="qr-code-hint" style="margin-top: 16px;">
          <p style="margin-bottom: 8px;">
            ⏰ 만료 시간: ${expiryTime} (1시간 유효)
          </p>
          <p style="font-size: 13px; color: #94a3b8;">
            참여자들이 이 QR 코드를 스캔하면 출석이 확인됩니다.
          </p>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="download-qr-btn" style="flex: 1;">
            이미지 다운로드
          </button>
          <button type="button" class="btn btn-primary" id="regenerate-qr-btn" style="flex: 1;">
            재생성
          </button>
        </div>
      </div>
    `;

    // 다운로드 버튼
    const downloadBtn = this.container.querySelector('#download-qr-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadQR());
    }

    // 재생성 버튼
    const regenerateBtn = this.container.querySelector('#regenerate-qr-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', async () => {
        regenerateBtn.disabled = true;
        regenerateBtn.textContent = '생성 중...';

        try {
          this.qrData = null;
          await this.generateQR();
          this.render();
        } catch (error) {
          alert(error.message || 'QR 재생성에 실패했습니다.');
          regenerateBtn.disabled = false;
          regenerateBtn.textContent = '재생성';
        }
      });
    }
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
