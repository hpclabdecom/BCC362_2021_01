
import Head from 'next/head';

import { useCallback, useEffect, useRef, useState } from 'react';

import io, { Socket } from 'socket.io-client';

import prismicApi from '../services/prismicApi';

import styles from '../styles/home.module.scss';

interface Seat {
  name: string;
  status: 'available' | 'occupied';
}

type Action = {
  name: 'Purchase' | 'Retrieve';
}

interface LogMessage {
  type: string;
  author: string;
  resource: string;
}

export default function Home() {

  const [socket, setSocket] = useState<Socket>();
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  const [serverConnected, setServerConnected] = useState<string>('');

  const [channels, setChannels] = useState<string[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');

  const [socketId, setSocketId] = useState<string>();

  const [isRedisConnected, setIsRedisConnected] = useState<boolean>(false);

  const [seats, setSeats] = useState<Seat[]>([
    {name: '01A', status: 'available'},
    {name: '01B', status: 'available'},
    {name: '01C', status: 'available'},
    {name: '01D', status: 'available'},
    {name: '02A', status: 'available'},
    {name: '02B', status: 'available'},
    {name: '02C', status: 'available'},
    {name: '02D', status: 'available'},
    {name: '03A', status: 'available'},
    {name: '03B', status: 'available'},
    {name: '03C', status: 'available'},
    {name: '03D', status: 'available'},
    {name: '04A', status: 'available'},
    {name: '04B', status: 'available'},
    {name: '04C', status: 'available'},
    {name: '04D', status: 'available'},
    {name: '05A', status: 'available'},
    {name: '05B', status: 'available'},
    {name: '05C', status: 'available'},
    {name: '05D', status: 'available'},
    {name: '06A', status: 'available'},
    {name: '06B', status: 'available'},
    {name: '06C', status: 'available'},
    {name: '06D', status: 'available'},
    {name: '07A', status: 'available'},
    {name: '07B', status: 'available'},
    {name: '07C', status: 'available'},
    {name: '07D', status: 'available'},
    {name: '08A', status: 'available'},
    {name: '08B', status: 'available'},
    {name: '08C', status: 'available'},
    {name: '08D', status: 'available'},
  ]);

  const [selectedSeat, setSelectedSeat] = useState<Seat>(null);

  const [notify, setNotify] = useState({ log: [] });

  const [isQueued, setIsQueued] = useState(false);

  const [purchasedSeat, setPurchasedSeat] = useState<Seat>(null);

  const [action, setAction] = useState<Action>(null);

  const [logMessages, setLogMessages] = useState<LogMessage[]>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);

  const logCanvasRef = useRef(null);

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

        newSocket.on('auth', message => {
          console.log(`Auth: ${message.socketId}`);
          setSocketId(message.socketId);
        });

        newSocket.on('redis_connected', () => {
          setIsRedisConnected(true);
        });

        newSocket.on('notify', message => {
          setNotify(message);
        });

        newSocket.on('redis_subscribed', () => {
          setIsSubscribed(true);
        })

        newSocket.on('resource_data', message => {
          const newSeats = seats.slice();
          const changedSeats = newSeats.map((seat, i) => {
            return {
              name: seat.name,
              status: message[i] == 0 ? 'available' : 'occupied'
            } as Seat
          });
          setSeats(changedSeats);
          setSelectedSeat(null);
        });

        setSocket(newSocket);
        // ---------- //

        setAvailableServers(['192.168.2.36']);
        // setAvailableServers(servers);
        console.log('set servers', servers);
      });
    });
  }, []);

  const connect = useCallback((host?: string) => {
    let hostname;
    if (host) {
      hostname = host;
    } else {
      hostname = availableServers[Math.floor(Math.random() * availableServers.length)];
    }
    console.log('connecting to', hostname, availableServers);
    socket.emit('redis_connect', { host: hostname, socketId });
    setServerConnected(hostname);
  }, [socket, socketId, availableServers]);

  const handleSwitchChannel = useCallback(async (channel: string) => {
    if (channel == currentChannel) return;

    if (!!currentChannel) {
      socket.emit('redis_unsubscribe');
      setIsSubscribed(false);
    }
    setNotify(null);
    setCurrentChannel(channel);
    setLogMessages(null);
    
    socket.emit('redis_subscribe', { channels: [channel] });
  }, [socket, currentChannel, action, isQueued, logMessages, notify]);

  useEffect(() => {
    if (isSubscribed) {
      socket.emit('redis_adquire', { resource: currentChannel });
      setIsQueued(true);
      setAction({ name: 'Retrieve' });  
    }
  }, [isSubscribed]);

  useEffect(() => { // Connect to redis
    if (!socket) return;
    if (!availableServers.length) return;
      connect();
  }, [socket, availableServers]);

  useEffect(() => {
    setChannels([
      'Viagem 1', 'Viagem 2', 'Viagem 3', 'Viagem 4', 'Viagem 5',
      'Viagem 6', 'Viagem 7', 'Viagem 8', 'Viagem 9', 'Viagem 10',
    ]);
  }, []);

  const seatPath = useCallback((status: 'available' | 'occupied' | 'selected') => {
    if (status == 'available') return 'seat_white.png';
    if (status == 'occupied') return 'seat_red.png';
    if (status == 'selected') return 'seat_blue.png';
  }, []);

  const handleSelectSeat = useCallback((seat: Seat) => {
    if (seat == selectedSeat) return;
    if (seat.status == 'occupied') return;

    setSelectedSeat(seat);
  }, [selectedSeat]);

  const handlePurchaseSeat = useCallback((seat: Seat) => {
    socket.emit('redis_adquire', { resource: currentChannel });
    setAction({ name: 'Purchase' });
    setIsQueued(true);
    setPurchasedSeat(seat);
  }, [socket, currentChannel, isQueued, purchasedSeat]);

  useEffect(() => {
    if (!notify) return;

    const { log } = notify;
    setLogMessages(log);

    setTimeout(() => {
      logCanvasRef.current.scrollTop = logCanvasRef.current.scrollHeight;
    }, 10);

    const filteredLogAdquire = log.filter(l => l.type == 'adquire');
    const filteredLogRelease = log.filter(l => l.type == 'release');
    const posInQueue = filteredLogAdquire.length - filteredLogAdquire.reverse().findIndex(l => l.author == socketId) - 1;

    if (posInQueue - filteredLogRelease.length == 0) {
      if (isQueued) {
        if (action.name == 'Purchase') {
          socket.emit('redis_publish_change', {
            resource: currentChannel,
            data: {
              seat: purchasedSeat.name
            }
          });
          setTimeout(() => {
            socket.emit('redis_retrieve', { resource: currentChannel });
            socket.emit('redis_release', { resource: currentChannel });
          }, 5000);
        } else if (action.name == 'Retrieve') {
          socket.emit('redis_retrieve', { resource: currentChannel });
          socket.emit('redis_release', { resource: currentChannel });
        }

        setIsQueued(false);
        setPurchasedSeat(null);
        setAction(null);
      }
    }

  }, [notify, socketId, socket, isQueued, purchasedSeat, currentChannel, action]);

  return (
    <>
      <Head>
        <title>Sync | Sistemas Distribuídos</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div>SD TRAVEL</div>
          <div className={styles.roomList}>
            <h1>Viagens</h1>
            {channels.map(channel => (
              <div
                key={channel}
                className={channel == currentChannel ? styles.selected : ''}
                onClick={() => handleSwitchChannel(channel)}>
                  {channel}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.chatContainer}>
          <h1>{currentChannel || 'Nenhuma viagem selecionada'}</h1>
          {currentChannel && <div>
            <div>
              <img src="bus.png"/>
              <div>
                {seats.map(seat => {
                  const path = seat == selectedSeat ? seatPath('selected') : seatPath(seat.status);
                  return (
                    <img
                      key={seat.name}
                      src={path}
                      onClick={() => handleSelectSeat(seat)}
                      style={{ cursor: seat.status == 'occupied' ? 'default' : 'pointer' }}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <h1>{selectedSeat ? `Assento ${selectedSeat.name}` : 'Nenhum assento selecionado'}</h1>
              {selectedSeat && <div>
                <p><span>Assento:</span><span>R$30,80</span></p>
                <p><span>Bagagem:</span><span>R$5,18</span></p>
                <p><span>Taxa:</span><span>R$1,97</span></p>
                <p><span>Total:</span><span>R$37,95</span></p>
                <div>
                  <button onClick={() => setSelectedSeat(null)}>Cancelar</button>
                  <button onClick={() => handlePurchaseSeat(selectedSeat)}>Comprar</button>
                </div>
              </div>}
            </div>
          </div>}
        </div>
        <div className={styles.log}>
          <h1>Log</h1>

          <div ref={logCanvasRef}>
            <table>
              <thead>
                <tr>
                  <td>N</td>
                  <td>Author</td>
                  <td>Action</td>
                  <td>Resource</td>
                </tr>
              </thead>
              <tbody>
                {logMessages && logMessages.map((message, i) => (
                  <tr key={i+message.resource}>
                    <td>{i}</td>
                    <td>{message.author}</td>
                    <td>{message.type}</td>
                    <td>{message.resource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className={styles.connectedTo}>
        {isRedisConnected ? `Conectado em ${serverConnected} como ${socketId}` : 'Desconectado'}
      </p>
    </>
  )
}
