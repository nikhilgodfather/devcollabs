import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "../config";
import { redisClient, subClient, isRedisConnected } from "../db/redis";
import { SocketEvent, SocketId } from "../types/socket";
import { USER_CONNECTION_STATUS, User } from "../types/user";
import { UserRole } from "../auth/types";
import { WorkspacesService } from "../workspaces/workspaces.service";

interface AuthSocket extends Socket {
  data: {
    user?: {
      userId: string;
      username: string;
      email: string;
    };
    role?: UserRole;
  };
}

// In-Memory map for basic presence (Redundant with Redis but keeping for now per constraints)
// Ideally, presence should be moved to Redis HSETs in Step 6
let userSocketMap: User[] = [];

function getUsersInRoom(roomId: string): User[] {
  const usersInRoom = userSocketMap.filter((user) => user.roomId == roomId);
  // Deduplicate by userId - keep the most recent connection (last in array)
  const uniqueUsers = new Map<string, User>();
  for (const user of usersInRoom) {
    uniqueUsers.set(user.userId, user);
  }
  return Array.from(uniqueUsers.values());
}

function getRoomId(socketId: SocketId): string | null {
  const roomId = userSocketMap.find(
    (user) => user.socketId === socketId
  )?.roomId;
  if (!roomId) return null;
  return roomId;
}

function getUserBySocketId(socketId: SocketId): User | null {
  const user = userSocketMap.find((user) => user.socketId === socketId);
  return user || null;
}

function removeOldUserEntry(userId: string, workspaceId: string): void {
  userSocketMap = userSocketMap.filter(
    (u) => !(u.userId === userId && u.roomId === workspaceId)
  );
}

const canWrite = (role?: UserRole) => {
  return role === UserRole.OWNER || role === UserRole.COLLABORATOR;
};

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000,
    adapter:
      isRedisConnected && redisClient && subClient
        ? createAdapter(redisClient, subClient)
        : undefined,
  });

  if (!isRedisConnected) {
    console.warn(
      "⚠️  Socket.IO running in local mode (Redis adapter disabled)"
    );
  }

  // 1. Handshake Auth (JWT)
  io.use((socket: Socket, next) => {
    const token = (socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1]) as string;
    if (!token)
      return next(new Error("Authentication error: No token provided"));

    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;
      socket.data.user = payload;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    const userPayload = authSocket.data.user;

    // 2. JOIN Workspace (Role Check)
    socket.on(SocketEvent.JOIN_REQUEST, async ({ roomId, username }) => {
      if (!userPayload) return socket.disconnect();

      const workspaceId = roomId; // Terminology alignment

      // Check Membership & Role
      try {
        const role = await WorkspacesService.getMemberRole(
          workspaceId,
          userPayload.userId
        );
        if (!role) {
          socket.emit(SocketEvent.USER_DISCONNECTED, {
            user: { username: "System" },
          }); // Or generic error
          return socket.disconnect();
        }
        authSocket.data.role = role;

        // Allow join - Remove old entry if user is reconnecting
        removeOldUserEntry(userPayload.userId, workspaceId);

        const actualUsername = userPayload.username;
        const user: User = {
          userId: userPayload.userId,
          username: actualUsername,
          roomId: workspaceId,
          status: USER_CONNECTION_STATUS.ONLINE,
          cursorPosition: 0,
          typing: false,
          socketId: socket.id,
          currentFile: null,
        };

        userSocketMap.push(user);
        await socket.join(workspaceId);

        socket.broadcast
          .to(workspaceId)
          .emit(SocketEvent.USER_JOINED, { user });
        const users = getUsersInRoom(workspaceId);

        io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users });
      } catch (e) {
        console.error("Join error", e);
        socket.disconnect();
      }
    });

    socket.on("disconnecting", () => {
      const user = getUserBySocketId(socket.id);
      if (!user) return;
      const roomId = user.roomId;
      socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, { user });
      userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
    });

    // --- Write Events (RBAC Enforced) ---

    socket.on(
      SocketEvent.SYNC_FILE_STRUCTURE,
      ({ fileStructure, openFiles, activeFile, socketId }) => {
        // This event seems to be a direct P2P sync request or initial load.
        // Allow if member.
        if (!authSocket.data.role) return;
        io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
          fileStructure,
          openFiles,
          activeFile,
        });
      }
    );

    socket.on(
      SocketEvent.DIRECTORY_CREATED,
      ({ parentDirId, newDirectory }) => {
        if (!canWrite(authSocket.data.role)) return;
        const roomId = getRoomId(socket.id);
        if (roomId)
          socket.broadcast
            .to(roomId)
            .emit(SocketEvent.DIRECTORY_CREATED, { parentDirId, newDirectory });
      }
    );

    socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.DIRECTORY_UPDATED, { dirId, children });
    });

    socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.DIRECTORY_RENAMED, { dirId, newName });
    });

    socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.DIRECTORY_DELETED, { dirId });
    });

    socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.FILE_CREATED, { parentDirId, newFile });
    });

    socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.FILE_UPDATED, { fileId, newContent });
    });

    socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.FILE_RENAMED, { fileId, newName });
    });

    socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId });
    });

    // --- User Status & Cursor (RBAC Enforced) ---

    socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
      // Status updates allowed for self
      userSocketMap = userSocketMap.map((u) =>
        u.socketId === socketId
          ? { ...u, status: USER_CONNECTION_STATUS.OFFLINE }
          : u
      );
      const roomId = getRoomId(socketId);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.USER_OFFLINE, { socketId });
    });

    socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
      userSocketMap = userSocketMap.map((u) =>
        u.socketId === socketId
          ? { ...u, status: USER_CONNECTION_STATUS.ONLINE }
          : u
      );
      const roomId = getRoomId(socketId);
      if (roomId)
        socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId });
    });

    socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
      // Chat allowed for all members? Assuming yes for now.
      if (!authSocket.data.role) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.RECEIVE_MESSAGE, { message });
    });

    // Strict Viewer Restriction: Viewers CANNOT emit cursor/typing
    socket.on(
      SocketEvent.TYPING_START,
      ({ cursorPosition, selectionStart, selectionEnd }) => {
        if (!canWrite(authSocket.data.role)) return;

        userSocketMap = userSocketMap.map((u) =>
          u.socketId === socket.id
            ? {
                ...u,
                typing: true,
                cursorPosition,
                selectionStart,
                selectionEnd,
              }
            : u
        );
        const user = getUserBySocketId(socket.id);
        if (user)
          socket.broadcast
            .to(user.roomId)
            .emit(SocketEvent.TYPING_START, { user });
      }
    );

    socket.on(SocketEvent.TYPING_PAUSE, () => {
      if (!canWrite(authSocket.data.role)) return;

      userSocketMap = userSocketMap.map((u) =>
        u.socketId === socket.id ? { ...u, typing: false } : u
      );
      const user = getUserBySocketId(socket.id);
      if (user)
        socket.broadcast
          .to(user.roomId)
          .emit(SocketEvent.TYPING_PAUSE, { user });
    });

    socket.on(
      SocketEvent.CURSOR_MOVE,
      ({ cursorPosition, selectionStart, selectionEnd }) => {
        if (!canWrite(authSocket.data.role)) return;

        userSocketMap = userSocketMap.map((u) =>
          u.socketId === socket.id
            ? { ...u, cursorPosition, selectionStart, selectionEnd }
            : u
        );
        const user = getUserBySocketId(socket.id);
        if (user)
          socket.broadcast
            .to(user.roomId)
            .emit(SocketEvent.CURSOR_MOVE, { user });
      }
    );

    // Drawing events (Treat as write)
    socket.on(SocketEvent.REQUEST_DRAWING, () => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
    });

    socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
      if (!canWrite(authSocket.data.role)) return;
      socket.broadcast
        .to(socketId)
        .emit(SocketEvent.SYNC_DRAWING, { drawingData });
    });

    socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
      if (!canWrite(authSocket.data.role)) return;
      const roomId = getRoomId(socket.id);
      if (roomId)
        socket.broadcast
          .to(roomId)
          .emit(SocketEvent.DRAWING_UPDATE, { snapshot });
    });
  });
};
