'use client';

import { Users, Wifi, WifiOff } from 'lucide-react';
import type { User } from '@/lib/types';

interface PresenceBarProps {
  users: User[];
  currentUser: User | null;
  isConnected: boolean;
}

export function PresenceBar({ users, currentUser, isConnected }: PresenceBarProps) {
  const allUsers = currentUser
    ? [currentUser, ...users.filter((u) => u.id !== currentUser.id)]
    : users;

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-board-column border border-board-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Users size={18} />
          <span className="text-sm font-medium">{allUsers.length} online</span>
        </div>
        <div className="flex items-center gap-1">
          {allUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-board-card border border-board-border"
              title={u.name}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: u.color }}
              />
              <span className="text-xs text-gray-300 max-w-[80px] truncate">
                {u.id === currentUser?.id ? `${u.name} (you)` : u.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isConnected ? (
          <>
            <Wifi size={16} className="text-emerald-500" />
            <span className="text-emerald-500">Live</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="text-amber-500" />
            <span className="text-amber-500">Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
}
