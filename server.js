const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 정적 파일 제공
app.use(express.static('public'));
app.use('/logos', express.static('logos'));

// 사용자 관리
const users = new Map();
const bannedWords = ['관리자', 'admin', '매니저', '서비스 책임자', '책임자'];

// 어드민 관리
const admins = new Set();
const bannedUsers = new Map(); // username -> {username, message, timestamp}
const timeBannedUsers = new Map(); // username -> {endTime, message}
const allMessages = []; // 모든 메시지 저장
const systemMessages = []; // 시스템 메시지 저장

// 날씨 API 설정
const WEATHER_API_KEY = '6f2fd962c0d8414fc87fb9b8f7ce229e'; // 실제 API 키로 교체 필요
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// 사용자 이름 중복 확인
function isUsernameAvailable(username) {
    for (let [_, user] of users) {
        if (user.username === username) {
            return false;
        }
    }
    return true;
}

// 금지된 단어 확인
function containsBannedWords(username) {
    const lowerUsername = username.toLowerCase();
    return bannedWords.some(word => lowerUsername.includes(word.toLowerCase()));
}

// 날씨 정보 가져오기
async function getWeather() {
    try {
        const response = await axios.get(`${WEATHER_API_URL}?q=Seoul&appid=${WEATHER_API_KEY}&units=metric&lang=kr`);
        return {
            temp: Math.round(response.data.main.temp),
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon
        };
    } catch (error) {
        console.error('날씨 API 오류:', error);
        return {
            temp: 20,
            description: '맑음',
            icon: '01d'
        };
    }
}

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('사용자 연결:', socket.id);

    // 어드민 로그인
    socket.on('adminLogin', () => {
        admins.add(socket.id);
        console.log('어드민 로그인:', socket.id);
    });

    // 어드민 데이터 요청
    socket.on('getAdminData', () => {
        if (!admins.has(socket.id)) return;
        
        const adminData = {
            users: Array.from(users.values()),
            messages: allMessages,
            bannedUsers: Array.from(bannedUsers.values()),
            timeBannedUsers: Array.from(timeBannedUsers.entries())
        };
        
        socket.emit('adminData', adminData);
    });

    // 사용자 이름 중복 확인
    socket.on('checkUsername', (data) => {
        const { username } = data;
        
        if (containsBannedWords(username)) {
            socket.emit('usernameResult', { 
                available: false, 
                message: '사용할 수 없는 단어가 포함되어 있습니다.' 
            });
            return;
        }
        
        const available = isUsernameAvailable(username);
        socket.emit('usernameResult', { 
            available, 
            message: available ? '사용 가능한 이름입니다.' : '이미 사용 중인 이름입니다.' 
        });
    });

    // 사용자 등록
    socket.on('registerUser', (data) => {
        const { username, email } = data;
        
        if (containsBannedWords(username)) {
            socket.emit('registrationResult', { 
                success: false, 
                message: '사용할 수 없는 단어가 포함되어 있습니다.' 
            });
            return;
        }
        
        if (!isUsernameAvailable(username)) {
            socket.emit('registrationResult', { 
                success: false, 
                message: '이미 사용 중인 이름입니다.' 
            });
            return;
        }
        
        // 사용자 정보 저장
        users.set(socket.id, {
            id: socket.id,
            username,
            email,
            profileImage: '/logos/정원스튜디오_CI_2025-블랙기본형.png',
            joinTime: new Date()
        });
        
        socket.username = username;
        socket.emit('registrationResult', { 
            success: true, 
            message: '등록이 완료되었습니다.' 
        });
        
        // 채팅방 입장 알림
        console.log(`사용자 입장 : ${socket.id}, ${username}, ${email}`);
        
        const joinMessage = `${username}님이 입장하셨습니다.`;
        systemMessages.push(joinMessage);
        
        socket.broadcast.emit('userJoined', {
            username,
            message: joinMessage
        });
        
        // 어드민들에게 알림
        admins.forEach(adminId => {
            const adminSocket = io.sockets.sockets.get(adminId);
            if (adminSocket) {
                adminSocket.emit('userJoined', { username, message: joinMessage });
            }
        });
        
        // 현재 사용자 목록 전송
        const userList = Array.from(users.values()).map(user => ({
            username: user.username,
            profileImage: user.profileImage
        }));
        io.emit('userList', userList);
    });

            // 메시지 전송
        socket.on('sendMessage', (data) => {
            const user = users.get(socket.id);
            if (!user) return;
            
            const messageData = {
                id: Date.now(),
                username: user.username,
                profileImage: user.profileImage,
                message: data.message,
                timestamp: new Date(),
                isOwn: false
            };
            
            // 메시지 저장
            allMessages.push(messageData);
            
            // 모든 클라이언트에게 메시지 전송
            io.emit('newMessage', messageData);
            
            // 어드민들에게 알림
            admins.forEach(adminId => {
                const adminSocket = io.sockets.sockets.get(adminId);
                if (adminSocket) {
                    adminSocket.emit('newMessage', messageData);
                }
            });
        });

    // 파일/음성 메시지
    socket.on('sendFile', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const messageData = {
            id: Date.now(),
            username: user.username,
            profileImage: user.profileImage,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileType: data.fileType,
            timestamp: new Date(),
            isOwn: false
        };
        
        io.emit('newFileMessage', messageData);
    });

    // 프로필 업데이트
    socket.on('updateProfile', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.profileImage = data.profileImage;
        users.set(socket.id, user);
        
        // 사용자 목록 업데이트
        const userList = Array.from(users.values()).map(u => ({
            username: u.username,
            profileImage: u.profileImage
        }));
        io.emit('userList', userList);
    });

    // 설정 업데이트
    socket.on('updateSettings', (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.settings = data;
        users.set(socket.id, user);
        
        socket.emit('settingsUpdated', { success: true });
    });

    // 날씨 정보 요청
    socket.on('getWeather', async () => {
        const weather = await getWeather();
        socket.emit('weatherUpdate', weather);
    });

    // 어드민 기능들
    socket.on('sendPopup', (data) => {
        if (!admins.has(socket.id)) return;
        
        if (data.target === 'all') {
            io.emit('showPopup', { html: data.html });
        } else if (data.target === 'specific' && data.user) {
            // 특정 유저에게만 팝업 전송
            const targetUser = Array.from(users.values()).find(u => u.username === data.user);
            if (targetUser) {
                const targetSocket = Array.from(users.keys()).find(id => users.get(id)?.username === data.user);
                if (targetSocket) {
                    io.to(targetSocket).emit('showPopup', { html: data.html });
                }
            }
        }
    });

    socket.on('banUser', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { username, message } = data;
        bannedUsers.set(username, {
            username,
            message,
            timestamp: new Date()
        });
        
        // 밴된 유저 강제 퇴장
        const bannedUser = Array.from(users.values()).find(u => u.username === username);
        if (bannedUser) {
            const bannedSocketId = Array.from(users.keys()).find(id => users.get(id)?.username === username);
            if (bannedSocketId) {
                io.to(bannedSocketId).emit('banned', { message });
                users.delete(bannedSocketId);
            }
        }
        
        // 어드민들에게 업데이트 알림
        admins.forEach(adminId => {
            const adminSocket = io.sockets.sockets.get(adminId);
            if (adminSocket) {
                adminSocket.emit('bannedUsersUpdate', {
                    bannedUsers: Array.from(bannedUsers.values())
                });
            }
        });
    });

    socket.on('unbanUser', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { username } = data;
        bannedUsers.delete(username);
        
        // 어드민들에게 업데이트 알림
        admins.forEach(adminId => {
            const adminSocket = io.sockets.sockets.get(adminId);
            if (adminSocket) {
                adminSocket.emit('bannedUsersUpdate', {
                    bannedUsers: Array.from(bannedUsers.values())
                });
            }
        });
    });

    socket.on('sendWarning', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { username, message } = data;
        const targetUser = Array.from(users.values()).find(u => u.username === username);
        if (targetUser) {
            const targetSocketId = Array.from(users.keys()).find(id => users.get(id)?.username === username);
            if (targetSocketId) {
                io.to(targetSocketId).emit('warning', { message });
            }
        }
    });

    socket.on('timeBan', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { username, message, seconds } = data;
        const endTime = new Date(Date.now() + seconds * 1000);
        
        timeBannedUsers.set(username, {
            endTime,
            message
        });
        
        // 타겟 유저에게 시간 밴 알림
        const targetUser = Array.from(users.values()).find(u => u.username === username);
        if (targetUser) {
            const targetSocketId = Array.from(users.keys()).find(id => users.get(id)?.username === username);
            if (targetSocketId) {
                io.to(targetSocketId).emit('timeBanned', { message, seconds });
            }
        }
        
        // 어드민들에게 업데이트 알림
        admins.forEach(adminId => {
            const adminSocket = io.sockets.sockets.get(adminId);
            if (adminSocket) {
                adminSocket.emit('timeBannedUsersUpdate', {
                    timeBannedUsers: Array.from(timeBannedUsers.entries())
                });
            }
        });
        
        // 시간 밴 자동 해제
        setTimeout(() => {
            timeBannedUsers.delete(username);
            admins.forEach(adminId => {
                const adminSocket = io.sockets.sockets.get(adminId);
                if (adminSocket) {
                    adminSocket.emit('timeBannedUsersUpdate', {
                        timeBannedUsers: Array.from(timeBannedUsers.entries())
                    });
                }
            });
        }, seconds * 1000);
    });

    socket.on('sendUserNotice', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { message } = data;
        io.emit('userNotice', { message });
    });

    socket.on('censorMessage', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { messageId } = data;
        const messageIndex = allMessages.findIndex(m => m.id == messageId);
        if (messageIndex !== -1) {
            const message = allMessages[messageIndex];
            const censoredText = '?'.repeat(message.message.length);
            allMessages[messageIndex].message = censoredText;
            
            // 모든 클라이언트에게 검열된 메시지 전송
            io.emit('messageCensored', { messageId, censoredText });
        }
    });

    socket.on('deleteMessage', (data) => {
        if (!admins.has(socket.id)) return;
        
        const { messageId } = data;
        const messageIndex = allMessages.findIndex(m => m.id == messageId);
        if (messageIndex !== -1) {
            allMessages.splice(messageIndex, 1);
            
            // 모든 클라이언트에게 메시지 삭제 알림
            io.emit('messageDeleted', { messageId });
        }
    });

    // 연결 해제
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            
            // 사용자 퇴장 알림
            console.log(`사용자 퇴장 : ${user.username}, ${user.email}`);
            
            const leaveMessage = `${user.username}님이 퇴장하셨습니다.`;
            systemMessages.push(leaveMessage);
            
            socket.broadcast.emit('userLeft', {
                username: user.username,
                message: leaveMessage
            });
            
            // 어드민들에게 알림
            admins.forEach(adminId => {
                const adminSocket = io.sockets.sockets.get(adminId);
                if (adminSocket) {
                    adminSocket.emit('userLeft', { username: user.username, message: leaveMessage });
                }
            });
            
            // 사용자 목록 업데이트
            const userList = Array.from(users.values()).map(u => ({
                username: u.username,
                profileImage: u.profileImage
            }));
            io.emit('userList', userList);
        }
        
        // 어드민 연결 해제
        if (admins.has(socket.id)) {
            admins.delete(socket.id);
            console.log('어드민 연결 해제:', socket.id);
        }
        
        console.log('사용자 연결 해제:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 