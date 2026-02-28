'use client';

import { useBoard } from '@/lib/hooks/useBoard';
import { BoardView } from '@/components/BoardView';

export default function Home() {
  const board = useBoard();

  return (
    <main className="min-h-screen p-6">
      <BoardView {...board} />
    </main>
  );
}
