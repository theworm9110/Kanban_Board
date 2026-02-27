'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { SortableCard } from './SortableCard';
import type { Card, Column } from '@/lib/types';

interface ColumnComponentProps {
  column: Column;
  cards: Card[];
  onCreateCard: () => void;
  onMoveCard: (cardId: string, columnId: string, order: number) => void;
  editLocks: Record<string, { userId: string; userName: string }>;
  currentUser: { id: string; name: string; color: string } | null;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  addComment: (cardId: string, content: string) => void;
  lockEdit: (cardId: string) => Promise<boolean>;
  unlockEdit: (cardId: string) => void;
}

export function ColumnComponent({
  column,
  cards,
  onCreateCard,
  editLocks,
  currentUser,
  updateCard,
  deleteCard,
  addComment,
  lockEdit,
  unlockEdit,
}: ColumnComponentProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      columnId: column.id,
      order: cards.length,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-[320px] rounded-xl border-2 min-h-[400px]
        transition-colors duration-150
        ${isOver ? 'border-blue-500 bg-blue-500/5' : 'border-board-border bg-board-column'}
      `}
    >
      <div className="flex items-center justify-between p-4 border-b border-board-border">
        <h2 className="font-semibold text-white">{column.title}</h2>
        <button
          onClick={onCreateCard}
          className="p-2 rounded-lg hover:bg-board-card text-gray-400 hover:text-white transition-colors"
          aria-label="Add card"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card, idx) => (
            <SortableCard
              key={card.id}
              card={card}
              order={idx}
              columnId={column.id}
              editLock={editLocks[card.id]}
              currentUser={currentUser}
              updateCard={updateCard}
              deleteCard={deleteCard}
              addComment={addComment}
              lockEdit={lockEdit}
              unlockEdit={unlockEdit}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
