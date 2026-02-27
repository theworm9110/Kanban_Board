const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.WS_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const USE_REDIS = process.env.USE_REDIS !== 'false';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PRESENCE_TTL = 30;
const EDIT_LOCK_TTL = 120;
const BOARD_KEY = 'board:state';

const defaultBoard = {
  id: 'board-1',
  columns: [
    { id: 'col-todo', title: 'To Do', order: 0 },
    { id: 'col-progress', title: 'In Progress', order: 1 },
    { id: 'col-done', title: 'Done', order: 2 },
  ],
  cards: [],
};

// In-memory fallback when Redis is unavailable
let memoryBoard = JSON.parse(JSON.stringify(defaultBoard));
const memoryPresence = new Map();
const memoryEditLocks = new Map();

let publisher = null;
let subscriber = null;
let redisAvailable = false;

async function initRedis() {
  if (!USE_REDIS) return;
  try {
    const Redis = require('ioredis');
    publisher = new Redis(REDIS_URL);
    subscriber = new Redis(REDIS_URL);

    publisher.on('error', () => {});
    subscriber.on('error', () => {});

    await Promise.race([
      new Promise((resolve) => publisher.once('ready', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);

    await subscriber.subscribe('board:events');
    subscriber.on('message', (channel, message) => {
      if (channel === 'board:events') {
        const { event } = JSON.parse(message);
        io.emit('board:event', event);
      }
    });

    redisAvailable = true;
    console.log('Redis connected');
  } catch (err) {
    if (publisher) publisher.disconnect();
    if (subscriber) subscriber.disconnect();
    publisher = null;
    subscriber = null;
    console.warn('Redis not available, using in-memory storage. Run "docker compose up -d" for persistence.');
  }
}

async function getBoard() {
  if (redisAvailable && publisher) {
    const raw = await publisher.get(BOARD_KEY);
    return raw ? JSON.parse(raw) : { ...defaultBoard, cards: [] };
  }
  return JSON.parse(JSON.stringify(memoryBoard));
}

async function setBoard(board) {
  if (redisAvailable && publisher) {
    await publisher.set(BOARD_KEY, JSON.stringify(board));
  }
  memoryBoard = board;
}

async function setPresence(userId, user) {
  if (redisAvailable && publisher) {
    await publisher.setex(`presence:${userId}`, PRESENCE_TTL, JSON.stringify(user));
  }
  memoryPresence.set(userId, user);
}

async function removePresence(userId) {
  if (redisAvailable && publisher) {
    await publisher.del(`presence:${userId}`);
  }
  memoryPresence.delete(userId);
}

async function acquireEditLock(cardId, userId, userName) {
  if (redisAvailable && publisher) {
    const key = `edit:${cardId}`;
    const existing = await publisher.get(key);
    if (existing && JSON.parse(existing).userId !== userId) return false;
    await publisher.setex(key, EDIT_LOCK_TTL, JSON.stringify({ userId, userName }));
    return true;
  }
  const existing = memoryEditLocks.get(cardId);
  if (existing && existing.userId !== userId) return false;
  memoryEditLocks.set(cardId, { userId, userName });
  return true;
}

async function releaseEditLock(cardId, userId) {
  if (redisAvailable && publisher) {
    const key = `edit:${cardId}`;
    const existing = await publisher.get(key);
    if (existing && JSON.parse(existing).userId === userId) {
      await publisher.del(key);
    }
  }
  const existing = memoryEditLocks.get(cardId);
  if (existing && existing.userId === userId) {
    memoryEditLocks.delete(cardId);
  }
}

function applyEvent(board, event) {
  const { type, payload } = event;
  const next = JSON.parse(JSON.stringify(board));

  switch (type) {
    case 'card:create':
      next.cards = next.cards || [];
      next.cards.push(payload);
      break;
    case 'card:move':
      const c1 = next.cards.find((c) => c.id === payload.cardId);
      if (c1) {
        c1.columnId = payload.columnId;
        c1.order = payload.order;
      }
      break;
    case 'card:update':
      const c2 = next.cards.find((c) => c.id === payload.id);
      if (c2) Object.assign(c2, { ...payload, id: c2.id });
      break;
    case 'card:delete':
      next.cards = (next.cards || []).filter((c) => c.id !== payload.cardId);
      break;
    case 'card:comment':
      const c3 = next.cards.find((c) => c.id === payload.cardId);
      if (c3) {
        c3.comments = c3.comments || [];
        c3.comments.push(payload);
      }
      break;
    default:
      break;
  }
  return next;
}

async function broadcastEvent(event) {
  if (redisAvailable && publisher) {
    await publisher.publish('board:events', JSON.stringify({ event }));
  } else {
    io.emit('board:event', event);
  }
}

async function start() {
  await initRedis();

  io.on('connection', async (socket) => {
    let currentUser = null;

    socket.emit('board:event', { type: 'board:init', payload: await getBoard() });

    socket.on('board:event', async (event) => {
      if (['card:create', 'card:move', 'card:update', 'card:delete', 'card:comment'].includes(event.type)) {
        const board = await getBoard();
        const next = applyEvent(board, event);
        await setBoard(next);
      }
      await broadcastEvent(event);
    });

    socket.on('presence:join', async (user) => {
      currentUser = user;
      await setPresence(user.id, user);
      socket.broadcast.emit('board:event', { type: 'presence:join', payload: user });
    });

    socket.on('presence:heartbeat', async (user) => {
      currentUser = user;
      await setPresence(user.id, user);
    });

    socket.on('edit:lock', async ({ cardId }) => {
      if (!currentUser) return;
      const acquired = await acquireEditLock(cardId, currentUser.id, currentUser.name);
      if (acquired) {
        socket.broadcast.emit('board:event', {
          type: 'edit:lock',
          payload: { cardId, userId: currentUser.id, userName: currentUser.name },
        });
        socket.emit('edit:lock:ok', { cardId });
      } else {
        socket.emit('edit:lock:denied', { cardId });
      }
    });

    socket.on('edit:unlock', async ({ cardId }) => {
      if (!currentUser) return;
      await releaseEditLock(cardId, currentUser.id);
      socket.broadcast.emit('board:event', {
        type: 'edit:unlock',
        payload: { cardId, userId: currentUser.id },
      });
    });

    socket.on('disconnect', async () => {
      if (currentUser) {
        await removePresence(currentUser.id);
        socket.broadcast.emit('board:event', { type: 'presence:leave', payload: { userId: currentUser.id } });
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`WebSocket server listening on port ${PORT}`);
  });
}

start();
