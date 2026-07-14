import { io, Socket } from 'socket.io-client';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } =
  process.env;

/**
 * チャット用 Socket.io 接続を生成する。
 * JWT を auth.token に付与して接続する。
 * autoConnect: false にすることで明示的に接続タイミングを制御する。
 */
export function createChatSocket(): Socket {
  const token = localStorage.getItem('token') ?? '';

  const serverUrl = REACT_APP_API_HOST
    ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
    : window.location.origin;

  return io(`${serverUrl}/chat`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
}
