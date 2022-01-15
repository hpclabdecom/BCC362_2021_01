
import Head from 'next/head';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import io, { Socket } from 'socket.io-client';

import prismicApi from '../services/prismicApi';

import styles from '../styles/home.module.scss';

type Message = {
  author: string;
  id: string;
  message: string;
  self?: boolean;
}

interface Channel {
  name: string;
  messages: Message[];
}

export default function Home() {

  const [socket, setSocket] = useState<Socket>();
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  const [serverConnected, setServerConnected] = useState<string>('');

  const [inputMessage, setInputMessage] = useState<string>('');

  const [newChannel, setNewChannel] = useState<boolean>(false);
  const [newChannelInput, setNewChannelInput] = useState<string>('');

  const [incomingMessage, setIncomingMessage] = useState({});

  const [author, setAuthor] = useState<string>('Anonymous');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel>();

  const [socketId, setSocketId] = useState<string>();

  const [isRedisConnected, setIsRedisConnected] = useState<boolean>(false);

  const chatCanvasRef = useRef(null);
  // const [channels, setChannels] = useState<Channel[]>([{ name: 'my-channel-1', messages: [] }]);
  // const [currentChannel, setCurrentChannel] = useState<Channel>({ name: 'my-channel-1', messages: [] });

  useEffect(() => {
    prismicApi.get('/').then(res => {
      const data = res.data as any;
      const ref = data.refs[0].ref;

      prismicApi.get(`/documents/search?ref=${ref}&format=json`).then(res => {
        const data = res.data as any;
        const servers = data.results[0].data.servers[0].text.split(';');

        // ---- backend ---- //
        const backendServer = servers.splice(servers.length - 1, 1);
        console.log('backend:', backendServer)
        const newSocket = io(`ws://127.0.0.1:3334`);
        // const newSocket = io(`wss://${backendServer}`);

        newSocket.on('message', message => {
          setIncomingMessage(message)
        });

        newSocket.on('auth', message => {
          setSocketId(message.socketId);
        });

        newSocket.on('redis_connected', () => {
          setIsRedisConnected(true);
        });

        setSocket(newSocket);
        // ---------- //

        setAvailableServers(['192.168.2.36']);
        // setAvailableServers(servers);
        console.log('set servers', servers);
      });
    });

    setAuthor(`Guest` + Math.floor(Math.random() * 100000));
  }, []);

  const handleReceivedMessage = useCallback(message => {
    const { channel, message: newMessage } = message;

    const messageChannelIndex = channels.findIndex(c => c.name == channel);
    const originalChannel = channels[messageChannelIndex];

    const parsedMessage = JSON.parse(newMessage);
    if (parsedMessage.id == socketId) {
      parsedMessage.self = true;
    }
    originalChannel.messages.push(parsedMessage);

    const originalChannels = channels.slice();
    originalChannels.splice(messageChannelIndex, 1);

    setChannels([...originalChannels, originalChannel]);

    if (currentChannel?.name == channel || originalChannels.length == 0) {
      setCurrentChannel(originalChannel);
    }

    setTimeout(() => {
      chatCanvasRef.current.scrollTop = chatCanvasRef.current.scrollHeight;
    }, 10);

  }, [channels, currentChannel, socketId]);

  useEffect(() => {
    if (Object.getOwnPropertyNames(incomingMessage).length)
      handleReceivedMessage(incomingMessage);
  }, [incomingMessage])

  const subscribe = useCallback(channels => {
    socket.emit('redis_subscribe', { channels: [ channels ] });
    setChannels([...channels, { name: channels, messages: [] }]);
  }, [socket, channels]);

  const publish = useCallback(() => {
    if (!currentChannel) return;
    socket.emit('redis_publish', { channel: currentChannel.name, message: inputMessage });
  }, [socket, inputMessage, currentChannel]);

  const connect = useCallback((host?: string) => {
    let hostname;
    if (host) {
      hostname = host;
    } else {
      hostname = availableServers[Math.floor(Math.random() * availableServers.length)];
    }
    console.log('connecting to', hostname, availableServers);
    socket.emit('redis_connect', { host: hostname, author });
    setServerConnected(hostname);
  }, [socket, availableServers]);

  const disconnect = useCallback(() => {
    socket.emit('redis_disconnect');
    setChannels([]);
    setCurrentChannel(null);
    setServerConnected('');
    setIsRedisConnected(false);
    setNewChannel(false);
  }, [socket, channels, currentChannel, serverConnected, isRedisConnected]);

  const handleInputMessage = useCallback((e: string) => {
    setInputMessage(e);
  }, []);

  const handleMessageSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (inputMessage == '') return;
    setInputMessage('');
    publish();
  }, [inputMessage, publish]);

  const handleNewChannelSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (channels.findIndex(c => c.name == newChannelInput) != -1) return;
    subscribe(newChannelInput);
    const newChannel = { name: newChannelInput, messages: [] };
    setChannels([...channels, newChannel]);
    setCurrentChannel(newChannel);
    setNewChannelInput('');
    setNewChannel(false);
  }, [newChannelInput, subscribe, channels]);

  const handleNewChannelInput = useCallback((e: string) => {
    setNewChannelInput(e);
  }, []);

  const handleSwitchChannel = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    setTimeout(() => {
      chatCanvasRef.current.scrollTop = chatCanvasRef.current.scrollHeight;
    }, 10);
  }, []);

  const handleConnectButtonClick = useCallback(() => {
    if (!isRedisConnected) {
      connect();
    } else {
      disconnect();
    }
  }, [isRedisConnected, socket, availableServers])

  return (
    <>
      <Head>
        <title>Chat | Sistemas Distribuídos</title>
      </Head>
      {/* <div>Hello World</div>
      <button onClick={ () => connect('192.168.2.36') }>Connect</button>
      <button onClick={ () => subscribe('my-channel-1') }>Subscribe</button>
      <button onClick={ () => subscribe('my-channel-2') }>Subscribe2</button>

      <div>
        <input type="text" onChange={ (e) => handleInputMessage(e.target.value) } value={inputMessage} />
        <button onClick={ () => publish() }>Publish</button>
      </div> */}

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div>SD CHAT</div>
          <div className={styles.roomList}>
            <h1>Canais</h1>
            {channels.map(channel => (
              <div
                key={channel.name}
                className={channel.name == currentChannel?.name ? styles.selected : ''}
                onClick={() => handleSwitchChannel(channel)}>
                  {channel.name}
              </div>
            ))}
            {!newChannel && <button disabled={!isRedisConnected} onClick={() => setNewChannel(true)}>Novo canal</button>}
            {newChannel &&
              <form onSubmit={(e) => handleNewChannelSubmit(e)}>
                <input
                  type="text"
                  placeholder='Nome do canal'
                  value={newChannelInput}
                  onChange={(e) => handleNewChannelInput(e.target.value)}
                  autoFocus
                />
              </form>}
          </div>
          <div onClick={handleConnectButtonClick} >
            { isRedisConnected ? 'Desconectar' : 'Conectar' }
          </div>
        </div>
        <div className={styles.chatContainer}>
          <div ref={chatCanvasRef}>
            {currentChannel?.messages.map((message, i) => {
              const newAuthor = i == 0 ? true : currentChannel.messages[i - 1].id != message.id ? true : false;
              return <div key={`${message.author}${i}`} className={message.self ? styles.right : ''}>
                {newAuthor && <h1>{message.author}</h1>}
                <p>{message.message}</p>
              </div>
            })}
          </div>
          <form onSubmit={ (e) => handleMessageSubmit(e) }>
            <input
              type="text"
              onChange={(e) => handleInputMessage(e.target.value)}
              placeholder={currentChannel ? `Conversar em ${currentChannel.name}` : ''}
              value={ inputMessage }
              disabled={!isRedisConnected}
            />
            <button disabled={!isRedisConnected} type='submit'>Enviar</button>
          </form>
        </div>
      </div>
      <p className={styles.connectedTo}>
        {isRedisConnected ? `Conectado em ${serverConnected} como ${author}` : 'Desconectado'}
      </p>
    </>
  )
}
