'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createSocket } from '@/lib/socket';
import { getUserColor } from '@/lib/utils';
import type { Board, BoardEvent, Card, Column, Comment, User } from '@/lib/types';

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editLocks, setEditLocks] = useState<Record<string, { userId: string; userName: string }>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      const user: User = {
        id: `user-${uuidv4().slice(0, 8)}`,
        name: `User ${Math.random().toString(36).slice(2, 6)}`,
        color: getUserColor(Math.floor(Math.random() * 9)),
      };
      setCurrentUser(user);
      socket.emit('presence:join', user);

      heartbeatRef.current = setInterval(() => {
        socket.emit('presence:heartbeat', user);
      }, 15000);
    });

    socket.on('board:event', (event: BoardEvent) => {
      switch (event.type) {
        case 'board:init':
          setBoard(event.payload);
          break;
        case 'card:create':
          setBoard((b) => {
            if (!b) return b;
            if ((b.cards || []).some((c) => c.id === event.payload.id)) return b;
            return { ...b, cards: [...(b.cards || []), event.payload] };
          });
          break;
        case 'card:move':
          setBoard((b) => {
            if (!b) return b;
            const cards = [...(b.cards || [])];
            const idx = cards.findIndex((c) => c.id === event.payload.cardId);
            if (idx >= 0) {
              cards[idx] = { ...cards[idx], columnId: event.payload.columnId, order: event.payload.order };
            }
            return { ...b, cards };
          });
          break;
        case 'card:update':
          setBoard((b) => {
            if (!b) return b;
            const cards = [...(b.cards || [])];
            const idx = cards.findIndex((c) => c.id === event.payload.id);
            if (idx >= 0) {
              cards[idx] = { ...cards[idx], ...event.payload };
            }
            return { ...b, cards };
          });
          break;
        case 'card:delete':
          setBoard((b) => (b ? { ...b, cards: (b.cards || []).filter((c) => c.id !== event.payload.cardId) } : b));
          break;
        case 'card:comment':
          setBoard((b) => {
            if (!b) return b;
            const cards = [...(b.cards || [])];
            const idx = cards.findIndex((c) => c.id === event.payload.cardId);
            if (idx >= 0) {
              const card = { ...cards[idx] };
              card.comments = card.comments || [];
              if (card.comments.some((cm) => cm.id === event.payload.id)) return b;
              card.comments = [...card.comments, event.payload];
              cards[idx] = card;
            }
            return { ...b, cards };
          });
          break;
        case 'presence:join':
          setUsers((u) => (u.some((x) => x.id === event.payload.id) ? u : [...u, event.payload]));
          break;
        case 'presence:leave':
          setUsers((u) => u.filter((x) => x.id !== event.payload.userId));
          setEditLocks((l) => {
            const next = { ...l };
            for (const [k, v] of Object.entries(l)) {
              if (v.userId === event.payload.userId) delete next[k];
            }
            return next;
          });
          break;
        case 'edit:lock':
          setEditLocks((l) => ({
            ...l,
            [event.payload.cardId]: { userId: event.payload.userId, userName: event.payload.userName },
          }));
          break;
        case 'edit:unlock':
          setEditLocks((l) => {
            const next = { ...l };
            delete next[event.payload.cardId];
            return next;
          });
          break;
        default:
          break;
      }
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: BoardEvent) => {
    socketRef.current?.emit('board:event', event);
  }, []);

  const createCard = useCallback(
    (columnId: string) => {
      const card: Card = {
        id: `card-${uuidv4()}`,
        columnId,
        title: 'New card',
        description: '',
        order: (board?.cards?.filter((c) => c.columnId === columnId).length || 0),
        comments: [],
        createdAt: Date.now(),
      };
      setBoard((b) => (b ? { ...b, cards: [...(b.cards || []), card] } : b));
      emit({ type: 'card:create', payload: card });
      return card;
    },
    [board, emit]
  );

  const moveCard = useCallback(
    (cardId: string, columnId: string, order: number) => {
      setBoard((b) => {
        if (!b) return b;
        const cards = [...(b.cards || [])];
        const idx = cards.findIndex((c) => c.id === cardId);
        if (idx >= 0) {
          cards[idx] = { ...cards[idx], columnId, order };
        }
        return { ...b, cards };
      });
      emit({ type: 'card:move', payload: { cardId, columnId, order } });
    },
    [emit]
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<Card>) => {
      setBoard((b) => {
        if (!b) return b;
        const cards = [...(b.cards || [])];
        const idx = cards.findIndex((c) => c.id === id);
        if (idx >= 0) cards[idx] = { ...cards[idx], ...patch };
        return { ...b, cards };
      });
      emit({ type: 'card:update', payload: { id, ...patch } });
    },
    [emit]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      setBoard((b) => (b ? { ...b, cards: (b.cards || []).filter((c) => c.id !== cardId) } : b));
      emit({ type: 'card:delete', payload: { cardId } });
    },
    [emit]
  );

  const addComment = useCallback(
    (cardId: string, content: string) => {
      if (!currentUser) return;
      const comment: Comment = {
        id: `comm-${uuidv4()}`,
        cardId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        content,
        createdAt: Date.now(),
      };
      setBoard((b) => {
        if (!b) return b;
        const cards = [...(b.cards || [])];
        const idx = cards.findIndex((c) => c.id === cardId);
        if (idx >= 0) {
          const card = { ...cards[idx] };
          card.comments = [...(card.comments || []), comment];
          cards[idx] = card;
        }
        return { ...b, cards };
      });
      emit({ type: 'card:comment', payload: comment });
    },
    [currentUser, emit]
  );

  const lockEdit = useCallback((cardId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      const onOk = (data: { cardId: string }) => {
        if (data.cardId === cardId) {
          socket.off('edit:lock:denied', onDenied);
          resolve(true);
        }
      };
      const onDenied = (data: { cardId: string }) => {
        if (data.cardId === cardId) {
          socket.off('edit:lock:ok', onOk);
          resolve(false);
        }
      };
      socket.once('edit:lock:ok', onOk);
      socket.once('edit:lock:denied', onDenied);
      socket.emit('edit:lock', { cardId });
    });
  }, []);

  const unlockEdit = useCallback((cardId: string) => {
    socketRef.current?.emit('edit:unlock', { cardId });
  }, []);

  return {
    board,
    users,
    editLocks,
    currentUser,
    isConnected,
    createCard,
    moveCard,
    updateCard,
    deleteCard,
    addComment,
    lockEdit,
    unlockEdit,
  };
}
