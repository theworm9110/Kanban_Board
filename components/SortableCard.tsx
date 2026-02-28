'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardComponent } from './Card';
import type { Card } from '@/lib/types';

interface SortableCardProps {
  card: Card;
  order: number;
  columnId: string;
  editLock: { userId: string; userName: string } | undefined;
  currentUser: { id: string; name: string; color: string } | null;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  addComment: (cardId: string, content: string) => void;
  lockEdit: (cardId: string) => Promise<boolean>;
  unlockEdit: (cardId: string) => void;
}

export function SortableCard(props: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.card.id,
    data: {
      type: 'card',
      card: props.card,
      columnId: props.columnId,
      order: props.order,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardComponent
        {...props}
        isDragging={isDragging}
      />
    </div>
  );
}
