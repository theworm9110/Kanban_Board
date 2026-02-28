export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  comments: Comment[];
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  columns: Column[];
  cards: Card[];
}

export type BoardEvent =
  | { type: 'card:move'; payload: { cardId: string; columnId: string; order: number } }
  | { type: 'card:create'; payload: Card }
  | { type: 'card:update'; payload: Partial<Card> & { id: string } }
  | { type: 'card:delete'; payload: { cardId: string } }
  | { type: 'card:comment'; payload: Comment }
  | { type: 'presence:join'; payload: User }
  | { type: 'presence:leave'; payload: { userId: string } }
  | { type: 'presence:heartbeat'; payload: User }
  | { type: 'edit:lock'; payload: { cardId: string; userId: string; userName: string } }
  | { type: 'edit:unlock'; payload: { cardId: string; userId: string } }
  | { type: 'board:init'; payload: Board };
