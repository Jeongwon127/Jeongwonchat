// Socket.IO 연결
const socket = io();

// DOM 요소들
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const agreeTermsCheckbox = document.getElementById('agreeTerms');
const checkUsernameBtn = document.getElementById('checkUsernameBtn');
const loginBtn = document.getElementById('loginBtn');
const usernameResult = document.getElementById('usernameResult');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const attachMenu = document.getElementById('attachMenu');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
const darkModeToggle = document.getElementById('darkModeToggle');
const mobileDarkModeToggle = document.getElementById('mobileDarkModeToggle');
const currentTime = document.getElementById('currentTime');
const currentUsername = document.getElementById('currentUsername');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const logoutBtn = document.getElementById('logoutBtn');
const shareBtn = document.getElementById('shareBtn');
const sidebarLogo = document.getElementById('sidebarLogo');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const weatherDesc = document.getElementById('weatherDesc');

// 사용자 정보
let currentUser = null;
let isDarkMode = false;

// 시간 업데이트
function updateTime() {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[now.getDay()];
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const ampm = hours < 12 ? '오전' : '오후';
    const displayHours = hours < 12 ? hours : hours - 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    currentTime.textContent = `${month}.${date}(${day}) ${ampm} ${displayHours}:${displayMinutes}`;
}

// 다크 모드 토글
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    // 로고 변경
    if (isDarkMode) {
        sidebarLogo.src = '/logos/정원스튜디오_CI_2025-화이트블랙배경용.png';
    } else {
        sidebarLogo.src = '/logos/정원스튜디오_CI_2025-블랙기본형.png';
    }
    
    // 아이콘 변경
    const icons = document.querySelectorAll('#darkModeToggle i, #mobileDarkModeToggle i');
    icons.forEach(icon => {
        icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    });
}

// 사이드바 토글
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// 사용자 이름 중복 확인
checkUsernameBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) {
        usernameResult.textContent = '사용자 이름을 입력해주세요.';
        usernameResult.className = 'result-message error';
        return;
    }
    
    socket.emit('checkUsername', { username });
});

// 서버로부터 사용자 이름 확인 결과 수신
socket.on('usernameResult', (data) => {
    usernameResult.textContent = data.message;
    usernameResult.className = `result-message ${data.available ? 'success' : 'error'}`;
    
    // 로그인 버튼 활성화/비활성화
    const canLogin = data.available && agreeTermsCheckbox.checked && emailInput.value.trim();
    loginBtn.disabled = !canLogin;
});

// 약관 동의 및 이메일 입력 시 로그인 버튼 상태 업데이트
function updateLoginButton() {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const agreed = agreeTermsCheckbox.checked;
    
    // 사용자 이름이 확인되었는지 확인
    const usernameChecked = !usernameResult.classList.contains('error') && usernameResult.textContent.includes('사용 가능');
    
    loginBtn.disabled = !(usernameChecked && agreed && email);
}

agreeTermsCheckbox.addEventListener('change', updateLoginButton);
emailInput.addEventListener('input', updateLoginButton);
usernameInput.addEventListener('input', () => {
    usernameResult.textContent = '';
    usernameResult.className = 'result-message';
    updateLoginButton();
});

// 로그인 처리
loginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    
    if (!username || !email || !agreeTermsCheckbox.checked) {
        alert('모든 필드를 입력하고 약관에 동의해주세요.');
        return;
    }
    
    socket.emit('registerUser', { username, email });
});

// 서버로부터 등록 결과 수신
socket.on('registrationResult', (data) => {
    if (data.success) {
        currentUser = {
            username: usernameInput.value.trim(),
            email: emailInput.value.trim()
        };
        
        // 화면 전환
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        
        // 사용자 정보 표시
        currentUsername.textContent = currentUser.username;
        userEmailDisplay.textContent = currentUser.email;
        
        // 시간 업데이트 시작
        updateTime();
        setInterval(updateTime, 1000);
        
        // 날씨 정보 요청
        socket.emit('getWeather');
        
        // 사이드바 이벤트 리스너 등록
        setupSidebarEvents();
        
    } else {
        alert(data.message);
    }
});

// 메시지 전송
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    socket.emit('sendMessage', { message });
    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 새 메시지 수신
socket.on('newMessage', (data) => {
    addMessage(data);
});

// 메시지 추가 함수
function addMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser?.username ? 'own' : ''}`;
    
    const time = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <img src="${data.profileImage}" alt="프로필" class="message-profile">
        <div class="message-content" data-message-id="${data.id}">
            <div class="message-header">
                <span>${data.username === currentUser?.username ? '나' : data.username}</span>
            </div>
            <div class="message-text">${data.message}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 사용자 입장/퇴장 알림
socket.on('userJoined', (data) => {
    addSystemMessage(data.message);
});

socket.on('userLeft', (data) => {
    addSystemMessage(data.message);
});

// 시스템 메시지 추가
function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.innerHTML = `
        <div class="message-content">
            ${message}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 첨부 메뉴 토글
attachBtn.addEventListener('click', () => {
    attachMenu.classList.toggle('hidden');
});

// 첨부 옵션 클릭
document.getElementById('voiceRecord').addEventListener('click', () => {
    attachMenu.classList.add('hidden');
    document.getElementById('voiceModal').classList.remove('hidden');
});

document.getElementById('fileShare').addEventListener('click', () => {
    attachMenu.classList.add('hidden');
    document.getElementById('fileModal').classList.remove('hidden');
});

// 모달 닫기
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsModal'));
document.getElementById('closeFileModal').addEventListener('click', () => closeModal('fileModal'));
document.getElementById('closeVoiceModal').addEventListener('click', () => closeModal('voiceModal'));

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

// 설정 모달 열기
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

// 설정 저장
saveSettings.addEventListener('click', () => {
    const settings = {
        language: document.getElementById('languageSelect').value,
        dataExport: document.getElementById('dataExport').checked,
        notificationType: document.getElementById('notificationType').value,
        saveProfile: document.getElementById('saveProfile').checked
    };
    
    socket.emit('updateSettings', settings);
    closeModal('settingsModal');
});

// 프로필 이미지 변경
document.getElementById('changeProfileBtn').addEventListener('click', () => {
    document.getElementById('profileImageInput').click();
});

document.getElementById('profileImageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            document.getElementById('currentProfileImage').src = imageUrl;
            
            // 서버에 프로필 이미지 업데이트
            socket.emit('updateProfile', { profileImage: imageUrl });
        };
        reader.readAsDataURL(file);
    }
});

// 파일 업로드
document.getElementById('uploadFile').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB
        alert('파일 크기는 100MB를 초과할 수 없습니다.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileData = {
            fileUrl: e.target.result,
            fileName: file.name,
            fileType: file.type
        };
        
        socket.emit('sendFile', fileData);
        closeModal('fileModal');
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
});

// 음성 녹음
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;

document.getElementById('startRecord').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 음성 메시지 전송
            socket.emit('sendFile', {
                fileUrl: audioUrl,
                fileName: '음성메시지.wav',
                fileType: 'audio/wav'
            });
            
            closeModal('voiceModal');
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // UI 업데이트
        document.getElementById('startRecord').classList.add('hidden');
        document.getElementById('stopRecord').classList.remove('hidden');
        document.getElementById('recordIcon').style.color = '#dc3545';
        
        // 타이머 시작
        let seconds = 0;
        recordingInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            document.getElementById('recordingTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            if (seconds >= 10) {
                stopRecording();
            }
        }, 1000);
        
    } catch (error) {
        alert('마이크 접근 권한이 필요합니다.');
    }
});

document.getElementById('stopRecord').addEventListener('click', stopRecording);

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    
    // UI 초기화
    document.getElementById('startRecord').classList.remove('hidden');
    document.getElementById('stopRecord').classList.add('hidden');
    document.getElementById('recordIcon').style.color = '';
    document.getElementById('recordingTime').textContent = '00:00';
}

// 파일 메시지 수신
socket.on('newFileMessage', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser?.username ? 'own' : ''}`;
    
    const time = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let fileContent = '';
    if (data.fileType.startsWith('audio/')) {
        fileContent = `<audio controls style="max-width: 200px;"><source src="${data.fileUrl}" type="${data.fileType}"></audio>`;
    } else if (data.fileType.startsWith('image/')) {
        fileContent = `<img src="${data.fileUrl}" alt="이미지" style="max-width: 200px; border-radius: 8px;">`;
    } else {
        fileContent = `<a href="${data.fileUrl}" download="${data.fileName}" style="color: inherit; text-decoration: none;">
            <i class="fas fa-file"></i> ${data.fileName}
        </a>`;
    }
    
    messageDiv.innerHTML = `
        <img src="${data.profileImage}" alt="프로필" class="message-profile">
        <div class="message-content">
            <div class="message-header">
                <span>${data.username === currentUser?.username ? '나' : data.username}</span>
            </div>
            <div class="message-text">${fileContent}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 날씨 정보 업데이트
socket.on('weatherUpdate', (weather) => {
    weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
    temperature.textContent = `${weather.temp}°C`;
    weatherDesc.textContent = weather.description;
});

// 로그아웃
logoutBtn.addEventListener('click', () => {
    if (confirm('정말 로그아웃하시겠습니까?')) {
        location.reload();
    }
});

// 공유
shareBtn.addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: '정원스튜디오 채팅',
            text: '정원스튜디오 채팅방에 참여해보세요!',
            url: window.location.href
        });
    } else {
        // 클립보드에 복사
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('링크가 클립보드에 복사되었습니다.');
        });
    }
});

// 사이드바 이벤트 설정
function setupSidebarEvents() {
    // 데스크톱 사이드바 토글
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // 모바일 사이드바 토글
    mobileSidebarToggle.addEventListener('click', toggleSidebar);
    
    // 다크모드 토글
    darkModeToggle.addEventListener('click', toggleDarkMode);
    mobileDarkModeToggle.addEventListener('click', toggleDarkMode);
    
    // 모바일에서 사이드바 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// 어드민 기능 이벤트 리스너들
socket.on('showPopup', (data) => {
    // 팝업 모달 표시
    const popupModal = document.createElement('div');
    popupModal.className = 'admin-popup-modal';
    popupModal.innerHTML = `
        <div class="admin-popup-content">
            ${data.html}
            <button class="admin-popup-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(popupModal);
});

socket.on('banned', (data) => {
    alert(`당신은 밴되었습니다: ${data.message}`);
    location.reload();
});

socket.on('warning', (data) => {
    alert(`경고: ${data.message}`);
});

socket.on('timeBanned', (data) => {
    alert(`시간 밴: ${data.message} (${data.seconds}초)`);
    // 시간 밴 동안 채팅 입력 비활성화
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (messageInput && sendBtn) {
        messageInput.disabled = true;
        sendBtn.disabled = true;
        messageInput.placeholder = `${data.seconds}초 동안 입력이 제한됩니다.`;
        
        setTimeout(() => {
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.placeholder = '메시지를 입력하세요...';
        }, data.seconds * 1000);
    }
});

socket.on('userNotice', (data) => {
    alert(`관리자 안내: ${data.message}`);
});

socket.on('messageCensored', (data) => {
    // 메시지 검열 처리
    const messageElements = document.querySelectorAll(`[data-message-id="${data.messageId}"]`);
    messageElements.forEach(element => {
        const messageText = element.querySelector('.message-text');
        if (messageText) {
            messageText.textContent = data.censoredText;
        }
    });
});

socket.on('messageDeleted', (data) => {
    // 메시지 삭제 처리
    const messageElements = document.querySelectorAll(`[data-message-id="${data.messageId}"]`);
    messageElements.forEach(element => {
        element.remove();
    });
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 입력 필드 이벤트 리스너
    usernameInput.addEventListener('input', updateLoginButton);
    emailInput.addEventListener('input', updateLoginButton);
    agreeTermsCheckbox.addEventListener('change', updateLoginButton);
    
    // 초기 로그인 버튼 상태
    updateLoginButton();
    
    // 파일 드래그 앤 드롭
    const fileUploadArea = document.querySelector('.file-upload-area');
    const fileInput = document.getElementById('fileInput');
    
    if (fileUploadArea && fileInput) {
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = '#667eea';
            fileUploadArea.style.background = '#f8f9fa';
        });
        
        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = '#e1e5e9';
            fileUploadArea.style.background = 'transparent';
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = '#e1e5e9';
            fileUploadArea.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
            }
        });
    }
}); 