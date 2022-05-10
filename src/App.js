import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { effects } from './video';

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import Peer from 'peerjs';
import TimeRange from 'react-timeline-range-slider';
import { format } from 'date-fns';

let duration = 0;
let time_ = [new Date(0), new Date(0)];
const ffmpeg = createFFmpeg({
  logger: (message) => {
    const regex = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/gm;
    const matches = regex.exec(String(message.message));
    if (matches != null) {
      const h = Number(matches[1]);
      const m = Number(matches[2]);
      const s = Number(matches[3]);
      const ms = Number(matches[4]);
      duration = h * 3600 + m * 60 + s + ms / 1000;
      time_[1] = new Date(duration * 1000);
    }
  },
  log: true,
});

export const App = () => {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState();
  const [message, setMessage] = useState('Click Start to transcode');
  const [time, setTime] = useState(time_);

  // eslint-disable-next-line
  const [filter, setFilter] = useState('empty');
  // eslint-disable-next-line
  const [error, setError] = useState();

  const [myId, setMyId] = useState('');
  const [friendId, setFriendId] = useState('');
  const [peerI, setPeerI] = useState({});

  const initialRender = useRef(true);

  const load = async () => {
    setMessage('Loading ffmpeg-core.js');
    await ffmpeg.load();
    setMessage('Start transcoding');
    setReady(true);
  };

  const UseFilter = async (elem) => {
    ffmpeg.FS('writeFile', 'test.mp4', await fetchFile(video));

    const args = effects(time)[elem];
    setFilter(elem);
    await ffmpeg.run(...args);
    setMessage('Complete transcoding');
    let data = await ffmpeg.FS('readFile', 'output.mp4');

    // Create a URL
    let url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    setVideo(url);
  };

  useEffect(() => {
    load();

    const peer = new Peer('', {
      host: 'localhost',
      port: '9000',
      path: '/myapp',
    });

    peer.on('open', (id) => {
      setMyId(id);
      setPeerI(peer)
    });

    peer.on('connection', (conn) => {
      conn.on('error', (error) => {
      })

      conn.on('data', (data) => {
        if (typeof data[0] === 'string') {
          if (data[1]) {
            setTime([new Date(data[1]), new Date(data[2])]);
            setFilter(data[0])
          }
          else {
            setFilter(data)
          }
        }
        else {
          const blob = new Blob([data.file], { type: data.filetype });
          const url = URL.createObjectURL(blob);
          setVideo(url)
        }
      });
    });
  }, []);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      UseFilter(filter);
    }
  }, [filter]);


  const send = (filter, ...args) => {
    const conn = peerI.connect(friendId);

    conn.on('open', () => {
      conn.send([filter, ...args]);
    });

  };

  const sendFile = (event) => {
    const conn = peerI.connect(friendId);

    const file = event.target.files[0];
    const blob = new Blob([event.target.files[0]], { type: file.type });

    conn.on('open', () => {
      conn.send({
        file: blob,
        filename: file.name,
        filetype: file.type
      });
    });
  }

  const timeline = (time) => {
    return <TimeRange
      onChangeCallback={(timelineInterval) => {
        setTime([timelineInterval[0], timelineInterval[1]]);
      }}
      step={100}
      ticksNumber={6}
      selectedInterval={time}
      timelineInterval={time}
      onUpdateCallback={(error) => setError(error)}
      formatTick={(ms) => format(new Date(ms), 'mm:ss')}
    />
  }
  const Filters = () => {
    return <div className='filters'>
      <h2>Filters</h2>
      <button onClick={() => {
        setMessage('Filter applying ...')
        setFilter('grayscale')
        send('grayscale')
      }}>Grayscale
      </button>
      <button onClick={() => {
        setMessage('Filter applying ...')
        setFilter('mute')
        send('mute')
      }}>Mute
      </button>
      <button onClick={() => {
        setMessage('Filter applying ...')
        setFilter('sepia')
        send('sepia')
      }}>Sepia
      </button>
      <button onClick={() => {
        setMessage('Filter applying ...')
        setFilter('trim')
        send('trim', time[0], time[1])
      }}>trim
      </button>
    </div>;
  };

  return ready ? (


    <div className="App">

      <div className='columnFirst'>
        <form>
          <input type="file" id='file' onChange={(e) => {
            const url2 = URL.createObjectURL(e.target.files[0])
            setVideo(url2);
            sendFile(e);
          }
          } />
          <label htmlFor='file'>Add file</label>
        </form>

        {Filters()}
      </div>
      <div className='columnSecond'>
        <h1>My ID: {myId}</h1>
        <label>Friend ID:</label>
        <input
          type="text"
          value={friendId}
          onChange={e => { setFriendId(e.target.value) }} />
        <br />
        <br />
        {video && <video
          controls
          width="250"
          src={video}
          id='video'
        >

        </video>}
        {duration ? timeline(time_) : undefined}
        <p>{message}</p>
      </div>

    </div>

  )
    :
    (
      <p>Loading...</p>
    );
}