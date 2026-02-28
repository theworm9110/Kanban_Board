import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3501';

export const createSocket = () => io(WS_URL, { transports: ['websocket', 'polling'] });
