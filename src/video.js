
import { format } from 'date-fns';


export const effects = (time, dime, leftCorner, res, ext) => {
    return {
        sepia: ['-i', 'test.mp4', '-filter:v', '[0:v]colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131[colorchannelmixed];\n' +
            '[colorchannelmixed]eq=1.0:0:1.3:2.4:1.0:1.0:1.0:1.0[color_effect]', 'output.mp4'],
        grayscale: ['-i', 'test.mp4', '-vf', 'format=gray', 'output.mp4'],
        black_white: ['-i', 'test.mp4', '-f', 'lavfi', '-i', `color=gray:s=${dime[0]}x${dime[1]}`, '-f', 'lavfi', '-i', `color=black:s=${dime[0]}x${dime[1]}`, '-f', 'lavfi', '-i', `color=white:s=${dime[0]}x${dime[1]}`, '-filter_complex', 'threshold', 'output.mp4'],
        mute: ['-i', 'test.mp4', '-vcodec', 'copy', '-an', 'output.mp4'],
        empty: ['-i', 'test.mp4', '-vcodec', 'copy', 'output.mp4'],
        trim: ['-i', 'test.mp4', '-ss', format(time[0], 'mm:ss'), '-t', format(time[1], 'mm:ss'), '-async', '1', 'output.mp4'],
        crop: ['-i', 'test.mp4', '-filter:v', `crop=${dime[0]}:${dime[1]}:${leftCorner[0]}:${leftCorner[1]}`, 'output.mp4'],
        extention: ['-i', 'test.mp4', '-vcodec', 'copy', `output.${ext}`],
        resolution: ['-i', 'test.mp4', '-vf', `scale=${res[0]}:${res[1]}`, 'output.mp4']
    }
};

export const handleReceiveFilter = (setMessage, setTime, setFilter, setVideo, setDime, setLeftCorner, setRes, setExt, time_, data) => {
    if (typeof data[0] === 'string') {
        setMessage('Filter applying ...')
        if (data[0] === 'trim') {
            setTime([new Date(data[1]), new Date(data[2])]);
            setFilter(data[0])
        }
        else if (data[0] === 'crop') {
            console.log('Receive ', data)
            setDime([data[1], data[2]]);
            setLeftCorner([data[3], data[4]])
            setFilter(data[0])
        }
        else if (data[0] === 'resolution') {
            setRes([data[1], data[2]])
            setFilter(data[0])
        }
        else if (data[0] === 'extention') {
            setExt(data[1])
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
        setTime(time_);
        setFilter('empty')
    }
}
