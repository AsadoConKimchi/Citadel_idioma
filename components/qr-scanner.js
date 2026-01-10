/**
 * QRScanner Component
 * Participant가 QR 코드를 스캔하여 출석 체크하는 컴포넌트
 */
class QRScanner {
  constructor(container, meetupId, currentUser, onSuccess) {
    this.container = container;
    this.meetupId = meetupId;
    this.currentUser = currentUser;
    this.onSuccess = onSuccess;
    this.scanner = null;
    this.isScanning = false;
  }

  /**
   * QR 스캔 성공 처리
   */
  async handleScan(decodedText) {
    if (this.isScanning) {
      return; // 중복 스캔 방지
    }

    this.isScanning = true;

    try {
      // 백엔드 API 호출하여 출석 체크
      const response = await MeetupAPI.checkIn(
        this.meetupId,
        this.currentUser.discord_id,
        decodedText
      );

      if (!response.success) {
        throw new Error(response.error || '출석 체크에 실패했습니다.');
      }

      // 스캐너 중지
      await this.stopScanning();

      // 성공 콜백
      if (this.onSuccess) {
        this.onSuccess(response.data);
      }

      alert('출석이 확인되었습니다!');
    } catch (error) {
      console.error('출석 체크 오류:', error);
      alert(error.message || '출석 체크에 실패했습니다.');
      this.isScanning = false;
    }
  }

  /**
   * 스캔 시작
   */
  async startScanning() {
    try {
      // html5-qrcode가 로드되지 않았으면 에러
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('QR 스캐너 라이브러리가 로드되지 않았습니다.');
      }

      // 스캐너 인스턴스 생성
      const scannerId = 'qr-reader';
      this.scanner = new Html5Qrcode(scannerId);

      // 스캔 시작
      await this.scanner.start(
        { facingMode: 'environment' }, // 후면 카메라 우선
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          this.handleScan(decodedText);
        },
        (errorMessage) => {
          // 스캔 실패는 무시 (계속 시도)
        }
      );
    } catch (error) {
      console.error('스캔 시작 오류:', error);

      // 카메라 권한 거부 또는 기타 오류
      if (error.name === 'NotAllowedError') {
        alert('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
      } else if (error.name === 'NotFoundError') {
        alert('카메라를 찾을 수 없습니다.');
      } else {
        alert(error.message || 'QR 스캔을 시작할 수 없습니다.');
      }

      throw error;
    }
  }

  /**
   * 스캔 중지
   */
  async stopScanning() {
    if (this.scanner) {
      try {
        await this.scanner.stop();
        this.scanner.clear();
        this.scanner = null;
      } catch (error) {
        console.error('스캔 중지 오류:', error);
      }
    }
  }

  /**
   * 렌더링
   */
  render() {
    this.container.innerHTML = `
      <div style="text-align: center;">
        <p style="color: #64748b; margin-bottom: 20px;">
          Organizer가 생성한 QR 코드를 스캔해주세요.
        </p>

        <div id="qr-reader" style="width: 100%; max-width: 500px; margin: 0 auto;"></div>

        <div style="margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="stop-scan-btn">
            스캔 중지
          </button>
        </div>

        <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            💡 카메라 권한이 필요합니다. 브라우저에서 권한을 허용해주세요.
          </p>
        </div>
      </div>
    `;

    // 중지 버튼
    const stopBtn = this.container.querySelector('#stop-scan-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        await this.stopScanning();
        if (this.container) {
          this.container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
              <p style="color: #64748b;">스캔이 중지되었습니다.</p>
            </div>
          `;
        }
      });
    }

    // 스캔 자동 시작
    setTimeout(() => {
      this.startScanning().catch((error) => {
        console.error('자동 스캔 시작 실패:', error);
      });
    }, 100);
  }

  /**
   * 표시
   */
  show() {
    this.container.classList.remove('hidden');
    this.render();
  }

  /**
   * 숨기기 및 정리
   */
  async hide() {
    await this.stopScanning();
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }

  /**
   * 컴포넌트 파괴
   */
  async destroy() {
    await this.stopScanning();
  }
}
