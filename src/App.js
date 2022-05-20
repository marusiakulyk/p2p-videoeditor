import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { effects, handleReceiveFilter } from './video';

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import Peer from 'peerjs';
import TimeRange from 'react-timeline-range-slider';
import { format } from 'date-fns';
import { Button, ButtonGroup, TextField, CircularProgress } from '@mui/material'

let time_ = [new Date(0), new Date(0)];
let dim = [0, 0];
const ffmpeg = createFFmpeg({
  logger: (message) => {
    const regexDur = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/gm;
    const matchesDur = regexDur.exec(String(message.message));
    const regexDim = /([0-9]{2,})x([0-9]+)/gm
    const matchesDim = regexDim.exec(String(message.message));
    if (matchesDur != null) {
      const h = Number(matchesDur[1]);
      const m = Number(matchesDur[2]);
      const s = Number(matchesDur[3]);
      const ms = Number(matchesDur[4]);
      const duration = h * 3600 + m * 60 + s + ms / 1000;
      time_[1] = new Date(duration * 1000);
    }

    if (matchesDim != null) {
      dim = [Number(matchesDim[1]), Number(matchesDim[2])];
    }
  },
  log: true,
});

export const App = () => {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState();
  const [message, setMessage] = useState();
  const [time, setTime] = useState([new Date(0), new Date(0)]);
  const [dime, setDime] = useState([1000, 1000]);
  const [leftCorner, setLeftCorner] = useState([0, 0])
  const [filter, setFilter] = useState();
  const [res, setRes] = useState([1000, 1000]);
  const [ext, setExt] = useState('mp4');
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
    console.log('filter', filter)
    console.log('dime', dime)

    setFilter(elem);
    const args = effects(time, dime, leftCorner, res, ext)[elem];
    await ffmpeg.run(...args);
    setMessage('Complete transcoding');
    let data = await ffmpeg.FS('readFile', `output.${ext}`);

    const type = `video/${ext}`;
    let url = URL.createObjectURL(new Blob([data.buffer], {type: type}));
    setVideo(url);
    setTime(time_);
    setDime(dim);
  };

  const metadataCollect = async () => {
    ffmpeg.FS('writeFile', 'test.mp4', await fetchFile(video));
    await ffmpeg.run('-i', 'test.mp4', '-vcodec', 'copy', 'output.mp4');
    setMessage('Complete transcoding');
    setTime(time_);
    setDime(dim);
    setRes(dim);
  }

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
        setError(error);
      })

      conn.on('data', (data) => {
        handleReceiveFilter(setMessage, setTime, setFilter, setVideo, setDime, setLeftCorner, setRes, setExt, time_, data);
      });
    });
  }, []);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
    }
    else {
      if (filter !== 'empty') {
        UseFilter(filter)
      }
      else {
        metadataCollect();
      }
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
    return <div className='columnFilter'>
      <ButtonGroup orientation='vertical' disableRipple fullWidth>
        <h2>Filters</h2>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('grayscale')
          send('grayscale')
        }}>Grayscale
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('mute')
          send('mute')
        }}>Mute
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('sepia')
          send('sepia')
        }}>Sepia
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('black_white')
          send('black_white')
        }}>Black and White
        </Button>
      </ButtonGroup>

      <ButtonGroup orientation='vertical' disableRipple fullWidth>
        <h2>Sizes</h2>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('trim')
          send('trim', ...time)
        }}>trim
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setFilter('crop')
          send('crop', ...dime, ...leftCorner)
        }}>crop
        </Button>
        <div>
          <TextField className={'smallInput'} placeholder='width' onChange={(e) => setDime([e.target.value, dime[1]])} />
          <TextField className={'smallInput'} placeholder='height' onChange={(e) => setDime([dime[0], e.target.value])} />
        </div>
        <div>
          <TextField className={'smallInput'} placeholder='corner x' onChange={(e) => setLeftCorner([e.target.value, dime[1]])} />
          <TextField className={'smallInput'} placeholder='corner y' onChange={(e) => setLeftCorner([dime[0], e.target.value])} />
        </div>
      </ButtonGroup>
    </div>
  };

  const Resolutions = () => {
    return <div  className='columnFilter'>
      <ButtonGroup orientation='vertical' disableRipple fullWidth>
        <h2>Resolutions</h2>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setRes([720, 480])
          setFilter('resolution')
          send('resolution', ...res)
        }}>480p
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setRes([1280, 720])
          setFilter('resolution')
          send('resolution', ...res)
        }}>720p
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setRes([1920,1080])
          setFilter('resolution')
          send('resolution', ...res)
        }}>1080p
        </Button>
      </ButtonGroup>
      <ButtonGroup orientation='vertical' disableRipple fullWidth>
        <h2>Extentions</h2>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setExt('mkv')
          setFilter('extention')
          send('extention', 'mkv')
        }}>mkv
        </Button>
        <Button onClick={() => {
          setMessage('Filter applying ...')
          setExt('mov')
          setFilter('extention')
          send('extention', 'mov')
        }}>mov
        </Button>        <Button onClick={() => {
          setMessage('Filter applying ...')
          setExt('mp4')
          setFilter('extention')
          send('extention', 'mp4')
        }}>mp4
        </Button>

      </ButtonGroup>
    </div>
  }
  const spinner = message !== 'Complete transcoding' ? <CircularProgress className='progress' /> : <></>;

  return ready && video ? (


    <div className="App">

      {Filters()}
      <div className='columnMain'>
        <div className='videoField'>
          {video && <video
            controls
            width="600"
            height="400"
            src={video}
            id='video'
          >
          </video>}
          {spinner}
        </div>
        {timeline(time_)}
      </div>
      {Resolutions()}

    </div>

  )
    :
    (<div className='startScreen'>
      <div className='peerInfo'>
        <h2>Establish peer connection</h2>
        <h3>Your ID: {myId}</h3>
        <TextField
          type="text"
          placeholder='Paste your friend id'
          value={friendId}
          onChange={e => { setFriendId(e.target.value) }}
          variant="outlined"
        />
      </div>
      <div className='description'>
        <h2>P2P video editor</h2>
        <p>Editor was implemented on base of FFMPEG.WASM</p>
        <form>
          <Button variant="contained" disableRipple>
            <input type="file" id='file' onChange={(e) => {
              const url2 = URL.createObjectURL(e.target.files[0])
              console.log(dime, ' dimention')
              sendFile(e);
              setVideo(url2);
              setFilter('empty')
            }
            } />
            Select video file
          </Button>
        </form>
      </div>
    </div>
    );
}