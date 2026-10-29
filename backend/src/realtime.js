// Tiempo real compatible con entities.X.subscribe() del SDK (socket.io).
import { Server } from 'socket.io';

let io = null;
const listeners = [];

export function attachRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/ws-user-apps/socket.io/',
    cors: { origin: true, credentials: true },
    transports: ['websocket', 'polling'],
  });
  io.on('connection', (socket) => {
    const appId = String(socket.handshake.query.app_id || '');
    socket.on('join', (room) => {
      // Solo se permiten salas de la propia app.
      if (typeof room === 'string' && room.includes(`:${appId}:`)) socket.join(room);
    });
    socket.on('leave', (room) => socket.leave(room));
  });
  return io;
}

export function onEntityEvent(fn) {
  listeners.push(fn);
}

export function emitEntityEvent(tenant, entity, type, record) {
  const payload = { type, data: record, id: record?.id, timestamp: new Date().toISOString() };
  if (io) {
    const room = `entities:${tenant.app_id}:${entity}`;
    io.to(room).emit('update_model', { room, data: JSON.stringify(payload) });
  }
  for (const fn of listeners) {
    Promise.resolve()
      .then(() => fn(tenant, entity, type, record))
      .catch((e) => console.error('[evento entidad]', e.message));
  }
}
