const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const Redis = require('ioredis');

const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, { cors: { origin: '*' } });

app.get('/servers', (req, res) => {
  console.log('GET servers');
  return res.json({
    servers: [
      '192.168.2.36'
    ],
    logs
  });
});

const logs = [];
for (let i = 1; i <= 10; i++) {
  logs[i] = [];
}

const resources = {};
for (let i = 1; i <= 10; i++) {
  resources[`Viagem ${i}`] = [];
  for (let j = 0; j < 32; j++) {
    resources[`Viagem ${i}`][j] = 0;
  }
}

function addToLog(id, type, author, resource) {
  logs[id].push({ type, author, resource });
  
  const keys = Object.keys(users);
  const filteredKeys = keys.filter(key => {
    return users[key].subscribes.includes(`Viagem ${id}`);
  });

  filteredKeys.forEach(key => {
    users[key].socket.emit('notify', { log: logs[id] });
  });
}

io.on('connection', socket => {
  console.log('user connected ', socket.id);
  users[socket.id] = {
    socket,
    subscribes: [],
    connection: {
      pub: null,
      sub: null,
    },
  };

  socket.emit('auth', { socketId: socket.id });

  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected.`);

    delete users[socket.id];
  });

  socket.on('redis_subscribe', message => {
    const { channels } = message;
    users[socket.id].connection.sub.subscribe(channels, (err, count) => {
      if (err) {
        console.error("Failed to subscribe: %s", err.message);
      } else {
        console.log(`${socket.id} subscribed to ${channels[0]}`);
        // console.log(
        //   `Subscribed successfully! This client is currently subscribed to ${count} channels.`
        // );
        users[socket.id].subscribes.push(channels[0]);
        socket.emit('redis_subscribed');
      }
    });

    const channelId = channels[0].split(' ')[1];
    // addToLog(channelId, 'subscribe', socket.id, `Viagem ${channelId}`);
  });

  socket.on('redis_publish', payload => {
    const { channel, message } = payload;
    users[socket.id].connection.pub.publish(channel, JSON.stringify({ id: socket.id, message, author: users[socket.id].author }));
  });

  socket.on('redis_connect', message => {
    const { host, author } = message;
    const subConnection = newConnection(host, (channel, message) => {
      socket.emit('message', { channel, message });
    });

    const pubConnection = newConnection(host);

    users[socket.id].connection.sub = subConnection;
    users[socket.id].connection.pub = pubConnection;
    users[socket.id].author = author;
    console.log(`${socket.id} connected to Redis!`);

    socket.emit('redis_connected');
  });

  socket.on('redis_disconnect', () => {
    users[socket.id].connection.sub.unsubscribe(users[socket.id].subscribes);
    users[socket.id].connection = {
      pub: null,
      sub: null,
    };
  });

  socket.on('redis_unsubscribe', () => {
    if (users[socket.id].subscribes.length) {
      users[socket.id].connection.sub.unsubscribe(users[socket.id].subscribes);

      const channelId = users[socket.id].subscribes[0].split(' ')[1];
      users[socket.id].subscribes = [];
      // addToLog(channelId, 'unsubscribe', socket.id, `Viagem ${channelId}`);
    }
  });

  socket.on('redis_adquire', message => {
    const { resource } = message;
    console.log(`${socket.id} adquired ${resource}`);

    const id = resource.split(' ')[1];
    addToLog(id, 'adquire', socket.id, resource);
  });

  socket.on('redis_release', message => {
    const { resource } = message;
    console.log(`${socket.id} released ${resource}`);

    const id = resource.split(' ')[1];
    addToLog(id, 'release', socket.id, resource);
  });

  socket.on('redis_retrieve', message => {
    const { resource } = message;
    console.log(`${socket.id} retrieved ${resource}`);

    socket.emit('resource_data', resources[resource]);
  });

  socket.on('redis_publish_change', message => {
    console.log('change');
    const { resource, data } = message;

    const { seat } = data;
    const index = (parseInt(seat.slice(0, 2)) - 1) * 4 + (seat.slice(2, 3).codePointAt() - 65);
    resources[resource][index] = 1;
  });
});

server.listen(3334, () => console.log('Listening...'));

// ------------------ //

const users = {};

function newConnection(host, callback) {
  const redis = new Redis(7000, host);

  if (callback) {
    redis.on('message', (channel, message) => callback(channel, message));
  }
  
  return redis;
}