
import { format } from 'date-fns';


export const effects = (time) => {
    return {
        sepia: ['-i', 'test.mp4', '-filter:v', '[0:v]colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131[colorchannelmixed];\n' +
            '[colorchannelmixed]eq=1.0:0:1.3:2.4:1.0:1.0:1.0:1.0[color_effect]', 'output.mp4'],
        grayscale: ['-i', 'test.mp4', '-vf', 'format=gray', 'output.mp4'],
        black_white: ['-i', 'test.mp4', '-f', 'lavfi', '-i', 'color=gray', '-f', 'lavfi', '-i', 'color=black:s=576x1024', '-f', 'lavfi', '-i', 'color=white:s=576x1024', '-filter_complex', 'threshold', 'output.mp4'],
        mute: ['-i', 'test.mp4', '-vcodec', 'copy', '-an', 'output.mp4'],
        empty: ['-i', 'test.mp4', '-vcodec', 'copy', 'output.mp4'],
        trim: ['-i', 'test.mp4', '-ss', format(time[0], 'mm:ss'), '-t', format(time[1], 'mm:ss'), '-async', '1', 'output.mp4'],
    }
};