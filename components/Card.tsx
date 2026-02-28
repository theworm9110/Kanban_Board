'use client';

import { useState } from 'react';
import { Pencil, Trash2, MessageCircle, X } from 'lucide-react';
import type { Card } from '@/lib/types';

interface CardComponentProps {
  card: Card;
  order: number;
  columnId: string;
  editLock?: { userId: string; userName: string };
  currentUser: { id: string; name: string; color: string } | null;
  isDragging?: boolean;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  addComment: (cardId: string, content: string) => void;
  lockEdit: (cardId: string) => Promise<boolean>;
  unlockEdit: (cardId: string) => void;
}

export function CardComponent({
  card,
  editLock,
  currentUser,
  isDragging,
  updateCard,
  deleteCard,
  addComment,
  lockEdit,
  unlockEdit,
}: CardComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description);
  const [showDetails, setShowDetails] = useState(false);
  const [newComment, setNewComment] = useState('');

  const lockedByOther = editLock && editLock.userId !== currentUser?.id;
  const lockedByMe = editLock?.userId === currentUser?.id;

  const handleStartEdit = async () => {
    if (lockedByOther) return;
    const ok = await lockEdit(card.id);
    if (ok) {
      setIsEditing(true);
      setTitle(card.title);
      setDesc(card.description);
    }
  };

  const handleSaveEdit = () => {
    updateCard(card.id, { title, description: desc });
    unlockEdit(card.id);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTitle(card.title);
    setDesc(card.description);
    unlockEdit(card.id);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (lockedByMe) unlockEdit(card.id);
    deleteCard(card.id);
    setShowDetails(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(card.id, newComment.trim());
    setNewComment('');
  };

  const commentCount = card.comments?.length ?? 0;

  return (
    <>
      <div
        className={`
          rounded-lg border bg-board-card p-4 transition-shadow
          ${isDragging ? 'opacity-80 shadow-xl' : 'border-board-border hover:border-gray-500'}
          ${lockedByOther ? 'ring-1 ring-amber-500/50' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-board-column border border-board-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Title"
                autoFocus
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 rounded bg-board-column border border-board-border text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 rounded bg-board-column text-gray-400 text-sm hover:bg-board-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-left w-full text-white font-medium truncate block hover:text-blue-400"
                >
                  {card.title}
                </button>
                {card.description && (
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">{card.description}</p>
                )}
                {lockedByOther && (
                  <p className="mt-1 text-xs text-amber-500">Editing by {editLock!.userName}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!lockedByOther && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded hover:bg-board-column text-gray-400 hover:text-white"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1 p-1.5 rounded hover:bg-board-column text-gray-400 hover:text-white"
                  title={`${commentCount} comment(s)`}
                >
                  <MessageCircle size={14} />
                  {commentCount > 0 && (
                    <span className="text-xs">{commentCount}</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDetails && (
        <CardDetailModal
          card={card}
          editLock={editLock}
          currentUser={currentUser}
          newComment={newComment}
          setNewComment={setNewComment}
          onClose={() => {
            if (lockedByMe) unlockEdit(card.id);
            setShowDetails(false);
          }}
          onAddComment={handleAddComment}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

interface CardDetailModalProps {
  card: Card;
  editLock?: { userId: string; userName: string };
  currentUser: { id: string; name: string; color: string } | null;
  newComment: string;
  setNewComment: (v: string) => void;
  onClose: () => void;
  onAddComment: () => void;
  onDelete: () => void;
}

function CardDetailModal({
  card,
  editLock,
  currentUser,
  newComment,
  setNewComment,
  onClose,
  onAddComment,
  onDelete,
}: CardDetailModalProps) {
  const lockedByOther = editLock && editLock.userId !== currentUser?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-board-column border border-board-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-board-border">
          <h3 className="font-semibold text-white text-lg">{card.title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-board-card text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {card.description && (
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{card.description}</p>
          )}
          {lockedByOther && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {editLock!.userName} is editing this card
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Comments</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {(card.comments ?? []).map((c) => (
                <div
                  key={c.id}
                  className="px-3 py-2 rounded-lg bg-board-card border border-board-border"
                >
                  <span className="text-xs text-gray-500">{c.authorName}</span>
                  <p className="text-sm text-gray-300 mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 rounded-lg bg-board-card border border-board-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={onAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-board-border flex justify-end">
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg bg-red-600/80 text-white text-sm hover:bg-red-600"
          >
            <Trash2 size={14} className="inline mr-2" />
            Delete card
          </button>
        </div>
      </div>
    </div>
  );
}
