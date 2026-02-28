'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { ColumnComponent } from './Column';
import { CardComponent } from './Card';
import { PresenceBar } from './PresenceBar';
import type { Board, Card, Column, User } from '@/lib/types';

interface BoardViewProps {
  board: Board | null;
  users: User[];
  editLocks: Record<string, { userId: string; userName: string }>;
  currentUser: User | null;
  isConnected: boolean;
  createCard: (columnId: string) => void;
  moveCard: (cardId: string, columnId: string, order: number) => void;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  addComment: (cardId: string, content: string) => void;
  lockEdit: (cardId: string) => Promise<boolean>;
  unlockEdit: (cardId: string) => void;
}

export function BoardView({
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
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const columns = board?.columns ?? [];
  const cards = board?.cards ?? [];

  const activeCard = useMemo(() => (activeId ? cards.find((c) => c.id === activeId) : null), [activeId, cards]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = String(active.id);
    const overData = over.data.current;
    if (!overData?.columnId) return;
    const targetColumnId = overData.columnId as string;
    const order = (overData.order as number) ?? 0;
    moveCard(cardId, targetColumnId, order);
  };

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PresenceBar users={users} currentUser={currentUser} isConnected={isConnected} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns
            .sort((a, b) => a.order - b.order)
            .map((col: Column) => (
              <ColumnComponent
                key={col.id}
                column={col}
                cards={cards.filter((c) => c.columnId === col.id).sort((a, b) => a.order - b.order)}
                onCreateCard={() => createCard(col.id)}
                onMoveCard={moveCard}
                editLocks={editLocks}
                currentUser={currentUser}
                updateCard={updateCard}
                deleteCard={deleteCard}
                addComment={addComment}
                lockEdit={lockEdit}
                unlockEdit={unlockEdit}
              />
            ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="opacity-95 shadow-xl rounded-lg bg-board-card border border-board-border p-4 min-w-[280px]">
              <span className="font-medium text-white">{activeCard.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
