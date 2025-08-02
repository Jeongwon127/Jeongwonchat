// Socket.IO 연결
const socket = io();

// 어드민 인증 정보
const ADMIN_CREDENTIALS = {
    id: 'adminjeongwon',
    password: '1234!jeongwon!admin'
};

// DOM 요소들
const adminLoginScreen = document.getElementById('adminLoginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminId = document.getElementById('adminId');
const adminPassword = document.getElementById('adminPassword');

// 시스템 메시지 관련
const systemMessages = document.getElementById('systemMessages');
const popupHtml = document.getElementById('popupHtml');
const popupTarget = document.getElementById('popupTarget');
const specificUserGroup = document.getElementById('specificUserGroup');
const specificUser = document.getElementById('specificUser');
const sendPopup = document.getElementById('sendPopup');

// 유저 밴 관련
const banUsername = document.getElementById('banUsername');
const banMessage = document.getElementById('banMessage');
const banUser = document.getElementById('banUser');

// 회원 관리 관련
const bannedUsers = document.getElementById('bannedUsers');
const warningTarget = document.getElementById('warningTarget');
const warningMessage = document.getElementById('warningMessage');
const timeBanSeconds = document.getElementById('timeBanSeconds');
const sendWarning = document.getElementById('sendWarning');
const timeBan = document.getElementById('timeBan');
const userTableBody = document.getElementById('userTableBody');

// 채팅 관리 관련
const chatList = document.getElementById('chatList');

// 모달 관련
const userNoticeModal = document.getElementById('userNoticeModal');
const userNoticeMessage = document.getElementById('userNoticeMessage');
const sendUserNotice = document.getElementById('sendUserNotice');

// 데이터 저장소
let allUsers = [];
let allMessages = [];
let bannedUsersList = [];
let timeBannedUsers = new Map();

// 어드민 로그인 처리
adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = adminId.value.trim();
    const password = adminPassword.value.trim();
    
    if (id === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password) {
        // 로그인 성공
        adminLoginScreen.classList.remove('active');
        adminDashboard.classList.add('active');
        
        // 어드민 연결
        socket.emit('adminLogin');
        
        // 초기 데이터 요청
        socket.emit('getAdminData');
        
    } else {
        alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
});

// 팝업 타겟 변경 시 특정 유저 입력 필드 표시/숨김
popupTarget.addEventListener('change', () => {
    if (popupTarget.value === 'specific') {
        specificUserGroup.style.display = 'block';
    } else {
        specificUserGroup.style.display = 'none';
    }
});

// 팝업 전송
sendPopup.addEventListener('click', () => {
    const html = popupHtml.value.trim();
    const target = popupTarget.value;
    const user = specificUser.value.trim();
    
    if (!html) {
        alert('HTML 내용을 입력해주세요.');
        return;
    }
    
    if (target === 'specific' && !user) {
        alert('특정 유저 닉네임을 입력해주세요.');
        return;
    }
    
    socket.emit('sendPopup', {
        html,
        target,
        user: target === 'specific' ? user : null
    });
    
    popupHtml.value = '';
    alert('팝업이 전송되었습니다.');
});

// 유저 밴
banUser.addEventListener('click', () => {
    const username = banUsername.value.trim();
    const message = banMessage.value.trim();
    
    if (!username) {
        alert('밴할 유저 닉네임을 입력해주세요.');
        return;
    }
    
    if (!message) {
        alert('밴 메시지를 입력해주세요.');
        return;
    }
    
    socket.emit('banUser', {
        username,
        message
    });
    
    banUsername.value = '';
    banMessage.value = '';
    alert('유저가 밴되었습니다.');
});

// 경고 전송
sendWarning.addEventListener('click', () => {
    const target = warningTarget.value;
    const message = warningMessage.value.trim();
    
    if (!target) {
        alert('대상 유저를 선택해주세요.');
        return;
    }
    
    if (!message) {
        alert('경고 메시지를 입력해주세요.');
        return;
    }
    
    socket.emit('sendWarning', {
        username: target,
        message
    });
    
    warningMessage.value = '';
    alert('경고가 전송되었습니다.');
});

// 시간 밴
timeBan.addEventListener('click', () => {
    const target = warningTarget.value;
    const message = warningMessage.value.trim();
    const seconds = parseInt(timeBanSeconds.value) || 0;
    
    if (!target) {
        alert('대상 유저를 선택해주세요.');
        return;
    }
    
    if (!message) {
        alert('밴 메시지를 입력해주세요.');
        return;
    }
    
    if (seconds <= 0) {
        alert('시간을 입력해주세요.');
        return;
    }
    
    socket.emit('timeBan', {
        username: target,
        message,
        seconds
    });
    
    warningMessage.value = '';
    timeBanSeconds.value = '';
    alert('시간 밴이 적용되었습니다.');
});

// 유저 안내 전송
sendUserNotice.addEventListener('click', () => {
    const message = userNoticeMessage.value.trim();
    
    if (!message) {
        alert('안내 메시지를 입력해주세요.');
        return;
    }
    
    socket.emit('sendUserNotice', {
        message
    });
    
    userNoticeMessage.value = '';
    closeModal('userNoticeModal');
    alert('안내가 전송되었습니다.');
});

// 모달 닫기
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

// 시스템 메시지 추가
function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item';
    messageDiv.textContent = message;
    
    systemMessages.appendChild(messageDiv);
    systemMessages.scrollTop = systemMessages.scrollHeight;
    
    // 최대 50개 메시지만 유지
    if (systemMessages.children.length > 50) {
        systemMessages.removeChild(systemMessages.firstChild);
    }
}

// 밴된 유저 목록 업데이트
function updateBannedUsers() {
    bannedUsers.innerHTML = '';
    
    bannedUsersList.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'banned-user-item';
        userDiv.innerHTML = `
            <div class="banned-user-info">
                <div class="banned-user-name">${user.username}</div>
                <div class="banned-user-message">${user.message}</div>
            </div>
            <button class="unban-btn" onclick="unbanUser('${user.username}')">
                <i class="fas fa-user-check"></i>
                밴 해제
            </button>
        `;
        bannedUsers.appendChild(userDiv);
    });
}

// 유저 밴 해제
function unbanUser(username) {
    socket.emit('unbanUser', { username });
    alert('유저 밴이 해제되었습니다.');
}

// 유저 목록 업데이트
function updateUserTable() {
    userTableBody.innerHTML = '';
    
    allUsers.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // 상태 확인
        let status = 'online';
        let statusText = '온라인';
        
        if (bannedUsersList.some(banned => banned.username === user.username)) {
            status = 'banned';
            statusText = '밴됨';
        } else if (timeBannedUsers.has(user.username)) {
            status = 'timebanned';
            statusText = '시간 밴';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="user-status ${status}">${statusText}</span></td>
            <td>
                <button class="chat-action-btn" onclick="showUserNotice('${user.username}')">
                    <i class="fas fa-bell"></i>
                    안내
                </button>
            </td>
        `;
        userTableBody.appendChild(row);
    });
    
    // 경고 타겟 선택 옵션 업데이트
    updateWarningTargetOptions();
}

// 경고 타겟 옵션 업데이트
function updateWarningTargetOptions() {
    warningTarget.innerHTML = '<option value="">유저를 선택하세요</option>';
    
    allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        warningTarget.appendChild(option);
    });
}

// 유저 안내 모달 표시
function showUserNotice(username) {
    document.getElementById('userNoticeModal').classList.remove('hidden');
    // 현재 선택된 유저 정보를 모달에 저장
    userNoticeModal.dataset.targetUser = username;
}

// 채팅 목록 업데이트
function updateChatList() {
    chatList.innerHTML = '';
    
    allMessages.forEach(message => {
        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-item';
        chatDiv.innerHTML = `
            <div class="chat-header">
                <span class="chat-user">${message.username}</span>
                <span class="chat-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="chat-content">${message.message}</div>
            <div class="chat-actions">
                <button class="chat-action-btn" onclick="censorMessage('${message.id}')">
                    <i class="fas fa-eye-slash"></i>
                    메시지 검열
                </button>
                <button class="chat-action-btn danger" onclick="deleteMessage('${message.id}')">
                    <i class="fas fa-trash"></i>
                    메시지 삭제
                </button>
            </div>
        `;
        chatList.appendChild(chatDiv);
    });
    
    chatList.scrollTop = chatList.scrollHeight;
}

// 메시지 검열
function censorMessage(messageId) {
    socket.emit('censorMessage', { messageId });
    alert('메시지가 검열되었습니다.');
}

// 메시지 삭제
function deleteMessage(messageId) {
    if (confirm('정말 이 메시지를 삭제하시겠습니까?')) {
        socket.emit('deleteMessage', { messageId });
        alert('메시지가 삭제되었습니다.');
    }
}

// Socket.IO 이벤트 리스너들

// 어드민 데이터 수신
socket.on('adminData', (data) => {
    allUsers = data.users || [];
    allMessages = data.messages || [];
    bannedUsersList = data.bannedUsers || [];
    
    updateUserTable();
    updateChatList();
    updateBannedUsers();
});

// 새로운 시스템 메시지
socket.on('newSystemMessage', (data) => {
    addSystemMessage(data.message);
});

// 새로운 유저 입장
socket.on('userJoined', (data) => {
    addSystemMessage(`${data.username}님이 입장하셨습니다.`);
});

// 유저 퇴장
socket.on('userLeft', (data) => {
    addSystemMessage(`${data.username}님이 퇴장하셨습니다.`);
});

// 새로운 메시지
socket.on('newMessage', (data) => {
    allMessages.push(data);
    updateChatList();
});

// 유저 목록 업데이트
socket.on('userListUpdate', (data) => {
    allUsers = data.users || [];
    updateUserTable();
});

// 밴된 유저 목록 업데이트
socket.on('bannedUsersUpdate', (data) => {
    bannedUsersList = data.bannedUsers || [];
    updateBannedUsers();
});

// 시간 밴 유저 업데이트
socket.on('timeBannedUsersUpdate', (data) => {
    timeBannedUsers = new Map(data.timeBannedUsers || []);
    updateUserTable();
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 어드민 로그인 폼 초기화
    adminLoginForm.reset();
}); 