const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

// สถานะโลกทั้งเซิร์ฟเวอร์ (อัปเดตแผนที่ขยาย 3200x2400 รองรับหมู่เกาะใหม่)
let world = {
  timeMinutes: 480,      // เริ่ม 08:00
  isNight: false,
  weather: 'clear',      // 'clear' (แจ่มใส), 'rain' (ฝนตก), 'fog' (หมอกลง)
  weatherTimer: 90,      // เปลี่ยนสภาพอากาศทุก 90 วินาที
  bossActive: false,
  bossSecondsLeft: 3600, // บอสปลาหมึกยักษ์เกิดทุก 1 ชั่วโมง
  bossX: 2150,
  bossY: 950,
  seaKingCaughtBy: null  // ปลา God-tier "ราชาแห่งท้องทะเล" มีตัวเดียวในเซิร์ฟเวอร์
};

setInterval(() => {
  // 1. เดินเวลา กลางวัน/กลางคืน
  world.timeMinutes = (world.timeMinutes + 10) % 1440;
  const hrs = Math.floor(world.timeMinutes / 60);
  world.isNight = (hrs >= 18 || hrs < 6);

  // 2. เปลี่ยนสภาพอากาศอัตโนมัติ
  world.weatherTimer--;
  if (world.weatherTimer <= 0) {
    world.weatherTimer = 90;
    const weathers = ['clear', 'clear', 'rain', 'fog'];
    world.weather = weathers[Math.floor(Math.random() * weathers.length)];
    const weatherNames = {
      clear: '☀️ ท้องฟ้าแจ่มใส',
      rain: '🌧️ พายุฝนตกหนัก (ปลาเรืองแสงปรากฏตัวในทะเลลึก!)',
      fog: '🌫️ หมอกหนาทึบปกคลุมผิวน้ำ (มีโอกาสพบปลาวิญญาณ!)'
    };
    io.emit('serverAnnouncement', { msg: `🌤️ [สภาพอากาศ] ${weatherNames[world.weather]}`, color: '#70a1ff' });
  }

  // 3. นับถอยหลังบอส
  if (!world.bossActive) {
    world.bossSecondsLeft--;
    if (world.bossSecondsLeft <= 0) spawnBoss();
  }

  io.emit('worldUpdate', world);
}, 1000);

function spawnBoss() {
  world.bossActive = true;
  world.bossX = 2100 + Math.random() * 120;
  world.bossY = 850 + Math.random() * 180;
  io.emit('serverAnnouncement', {
    msg: '⚠️ [BOSS] บอสปลาหมึกยักษ์ปรากฏตัวที่โซน 5 (ทะเลลึก) แล้ว!',
    color: '#ff4757'
  });
  io.emit('worldUpdate', world);
}

function broadcastLeaderboard() {
  const list = Object.values(players)
    .map(p => ({ id: p.id, name: p.name, lvl: p.lvl, title: p.title }))
    .sort((a, b) => b.lvl - a.lvl)
    .slice(0, 10);
  io.emit('leaderboardUpdate', list);
}

io.on('connection', (socket) => {
  socket.on('joinGame', (username) => {
    const cleanName = (username || '').trim();
    const validRegex = /^[a-zA-Z0-9ก-๙]{3,15}$/;

    if (!validRegex.test(cleanName)) {
      socket.emit('joinError', '❌ ชื่อต้องมี 3-15 ตัวอักษร และห้ามใช้อักษรพิเศษ');
      return;
    }

    const isTaken = Object.values(players).some(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (isTaken) {
      socket.emit('joinError', '❌ ชื่อนี้มีผู้เล่นอื่นใช้งานอยู่แล้ว');
      return;
    }

    players[socket.id] = {
      id: socket.id,
      name: cleanName,
      lvl: 1,
      title: '',
      x: 965,
      y: 905,
      boat: 0,
      rod: 0,
      skin: 0,
      isFishing: false,
      color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`
    };

    socket.emit('joinSuccess', { player: players[socket.id], world, allPlayers: players });
    socket.broadcast.emit('playerJoined', players[socket.id]);
    broadcastLeaderboard();

    io.emit('serverAnnouncement', {
      msg: `⛵ กัปตัน ${cleanName} เข้าสู่โลกแห่งหมู่เกาะตกปลา!`,
      color: '#64ffda'
    });
  });

  socket.on('updateState', (data) => {
    if (!players[socket.id]) return;
    const prevLvl = players[socket.id].lvl;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].boat = data.boat;
    players[socket.id].rod = data.rod;
    players[socket.id].skin = data.skin || 0;
    players[socket.id].lvl = Math.min(100, data.lvl);
    players[socket.id].title = data.title || '';
    players[socket.id].isFishing = data.isFishing;

    if (prevLvl < 100 && players[socket.id].lvl === 100) {
      io.emit('serverAnnouncement', {
        msg: `👑 [ตำนานบทใหม่] กัปตัน ${players[socket.id].name} บรรลุเลเวล 100 (MAX) แล้ว!!`,
        color: '#ffd700'
      });
    }

    if (prevLvl !== players[socket.id].lvl) broadcastLeaderboard();
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('sendChat', (rawText) => {
    if (!players[socket.id]) return;
    const text = (rawText || '').trim().slice(0, 80);
    if (!text) return;

    io.emit('chatMessage', {
      id: socket.id,
      name: players[socket.id].name,
      lvl: players[socket.id].lvl,
      title: players[socket.id].title,
      color: players[socket.id].color,
      text: text
    });
  });

  socket.on('catchSeaKing', () => {
    if (!players[socket.id] || world.seaKingCaughtBy) return;
    world.seaKingCaughtBy = players[socket.id].name;
    players[socket.id].title = 'เทพแห่งท้องทะเล';
    io.emit('worldUpdate', world);
    broadcastLeaderboard();
    io.emit('serverAnnouncement', {
      msg: `🌟 [ปรากฏการณ์ระดับโลก] ${players[socket.id].name} ตกได้ "ราชาแห่งท้องทะเล" ตัวเดียวในเซิร์ฟเวอร์ และได้รับยศ [เทพแห่งท้องทะเล]!!`,
      color: '#ffd700'
    });
  });

  socket.on('bossCaught', () => {
    if (!players[socket.id] || !world.bossActive) return;
    const winnerName = players[socket.id].name;
    world.bossActive = false;
    world.bossSecondsLeft = 3600;
    io.emit('worldUpdate', world);
    io.emit('serverAnnouncement', {
      msg: `🎉 [ประกาศทั้งเซิร์ฟเวอร์] ${winnerName} ปราบและตกได้ 👑 บอสปลาหมึกยักษ์ สำเร็จ!!`,
      color: '#ffd700'
    });
  });

  socket.on('forceSpawnBoss', () => { if (!world.bossActive) spawnBoss(); });
  socket.on('cycleWeather', () => {
    const order = { clear: 'rain', rain: 'fog', fog: 'clear' };
    world.weather = order[world.weather];
    world.weatherTimer = 90;
    io.emit('worldUpdate', world);
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      const leftName = players[socket.id].name;
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
      broadcastLeaderboard();
      io.emit('serverAnnouncement', { msg: `👋 กัปตัน ${leftName} ออกจากเกมไปแล้ว`, color: '#8892b0' });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌊 Ocean Master Server running at http://localhost:${PORT}`));
