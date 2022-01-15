const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const Redis = require('ioredis');

const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, { cors: { origin: '*' } });

var key = fs.readFileSync(path.resolve(__dirname, 'key.pem'), 'utf-8');
var cert = fs.readFileSync(path.resolve(__dirname, 'server.crt'), 'utf-8');
var options = {
  key,
  cert
}

const httpsServer = https.createServer(options, app);

app.get('/servers', (req, res) => {
  console.log('GET servers');
  return res.json({
    servers: [
      '192.168.2.36'
    ],
  });
});

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
        console.log(
          `Subscribed successfully! This client is currently subscribed to ${count} channels.`
        );
        users[socket.id].subscribes.push(channels[0]);
      }
    })
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

});

server.listen(3334, () => console.log('Listening...'));
httpsServer.listen(3335, () => console.log('listening'));

// ------------------ //

const users = {};

function newConnection(host, callback) {
  const redis = new Redis(7000, host);

  if (callback) {
    redis.on('message', (channel, message) => callback(channel, message));
  }
  
  return redis;
}