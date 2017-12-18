import io from 'socket.io-client';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

export default function SocketConnection() {

  return {
    connect,
    setRole,
    joinRoom,
    leaveRoom,
    getRooms,
    send,
    getData,
    setClientData,
    joinSession,
    socket: null,
    role: null,
    room: null,
    clients: [],
  };

  function connect({ host }) {

    this.clientLeft$ = new Subject();
    this.clientJoined$ = new Subject();
    this.clientListUpdate$ = new Subject();

    return new Promise((resolve, reject) => {
      console.info('connecting');
      this.socket = io(host);
      this.socket.on('connect', () => {
        this.connected = true;
        console.info('connected');
      });
      this.socket.on('connect_timeout', () => {
        this.connected = false;
        console.info('timeout');
      });
    });
  }

  function setRole(role) {
    this.role = role;
  }

  function joinRoom(room, role) {
    if (!this.connected) throw new Error('not connected');

    // allow only one room at a time
    if (this.room) {
      this.leaveRoom(this.room);
    }

    return new Promise((resolve, reject) => {
      const callbackId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const req = this.socket.emit('joinRoom', { room, role }, callbackId);

      this.socket.on('clientJoined', (client) => {
        this.clients.push(client);
        this.clientJoined$.next(client);
        this.clientListUpdate$.next();
      });


      this.socket.on('clientLeft', (clientId) => {
        this.clients = this.clients.filter(({ id }) => id !== clientId);
        this.clientLeft$.next(clientId);
        this.clientListUpdate$.next();
      });

      this.socket.on('clientChangedData', (alteredClient) => {
        const remainingClients = this.clients.filter(({ id }) => id !== alteredClient.id);
        this.clients = [...remainingClients, alteredClient];
        this.clientListUpdate$.next(alteredClient);
      });

      req.once(callbackId, ({ err, res }) => {
        if (err) {
          return reject(err);
        }
        this.clients = res.clients;
        this.room = res.name;
        resolve();
      });

    });
  }

  function leaveRoom(room) {
    if (!this.connected) throw new Error('not connected');
    this.socket.emit('leaveRoom', { room });

    this.socket.off('clientJoined', (client) => {
      this.clients.push(client);
      this.clientJoined$.next(client);
    });

    this.socket.off('clientLeft', (clientId) => {
      this.clients = this.clients.filter(({ id }) => id !== clientId);
      this.clientLeft$.next(clientId);
    });

    this.room = null;
  }

  function setClientData(data) {
    if (!this.connected) throw new Error('not connected');
    this.socket.emit('setClientData', { room: this.room, data });

    if(data.role){
      this.setRole(data.role);
    }

  }

  function getRooms() {
    if (!this.connected) throw new Error('not connected');
    return new Promise((resolve, reject) => {
      const callbackId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const req = this.socket.emit('getRooms', callbackId);
      req.once(callbackId, (rooms) => {
        resolve(rooms);
      });
    });
  }

  function send({ room = this.room, data, messageType = 'message'}) {
    if (!this.connected) throw new Error('not connected');
    if (room) {
      this.socket.emit('send', { room, data, messageType });
    } else {
      throw new Error('not joined to a room');
    }
  }

  function getData(action = 'message') {
    return new Observable((observer) => {
      this.socket.on(action, (data) => {
        observer.next(data);
      });
    });
  }

  async function joinSession({ id, prefix = '', role = 'Client' }){
    try {
      const room = id || Math.random().toString(36).substring(7);
      await this.joinRoom(prefix + room, role);
      this.setRole(role);
      return room;
    } catch (err) {
      throw new Error(err);
    }
  }
}

