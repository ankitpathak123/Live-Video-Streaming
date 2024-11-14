const NodeMediaServer = require('node-media-server');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to ffmpeg executable
const ffmpegPath = 'C:/ffmpeg/bin/ffmpeg'; // Ensure this path is correct

// Log the FFmpeg path to confirm
console.log(`Using FFmpeg at: ${ffmpegPath}`);

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_interval: 60,
  },
  http: {
    port: 8000,
    mediaroot: path.join(__dirname, 'public'),
    webroot: path.join(__dirname, 'public'),
    auth: {
      api: true,
      play: true,
      publish: true,
    },
  },
  trans: {
    ffmpeg: ffmpegPath,
    tasks: [
      {
        app: 'live',
        stream: 'stream',
        hls: true,
        hlsFlags: ['delete_segments', 'append_list'],
        hlsTime: 10,
        hlsListSize: 6,
        hlsPath: path.join(__dirname, 'public/hls'),
      },
    ],
  },
};

const nms = new NodeMediaServer(config); // Using NodeMediaServer with config
nms.run();

nms.on('prePublish', (id, streamPath, args) => {
  console.log(`[NodeMediaServer] Stream started: id=${id}, streamPath=${streamPath}`);

  // Define the output path for the recorded video
  const outputVideoPath = path.join(__dirname, 'public', 'recordings', `stream-${id}.mp4`);
  
  // Ensure the recordings directory exists
  const recordingsDir = path.join(__dirname, 'public', 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // FFmpeg arguments for recording the stream
  const recordingArgs = [
    '-i', `rtmp://127.0.0.1:1935${streamPath}`,   // Input RTMP stream
    '-c:v', 'copy',                                // Video codec
    '-c:a', 'copy',                                // Audio codec
    '-f', 'mp4',                                   // Output format
    '-y',                                          // Overwrite output if exists
    outputVideoPath                                // Output video path
  ];

  // FFmpeg arguments for HLS (the original configuration for HLS)
  const hlsArgs = [
    '-i', `rtmp://127.0.0.1:1935${streamPath}`,   // Input RTMP stream
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-f', 'hls',
    '-hls_time', '10',
    '-hls_list_size', '6',
    '-hls_flags', 'delete_segments',
    path.join(__dirname, 'public/hls', 'stream.m3u8') // Output HLS path
  ];

  // Log the complete FFmpeg command for recording
  console.log(`Running FFmpeg for recording with the following command:`);
  console.log(`${ffmpegPath} ${recordingArgs.join(' ')}`);

  // Spawn the FFmpeg process to start recording
  const ffmpegRecordProcess = spawn(ffmpegPath, recordingArgs);

  // Log FFmpeg output for debugging
  ffmpegRecordProcess.stdout.on('data', (data) => {
    console.log(`[FFmpeg Record] stdout: ${data}`);
  });

  ffmpegRecordProcess.stderr.on('data', (data) => {
    console.error(`[FFmpeg Record] stderr: ${data}`);
  });

  // Log FFmpeg exit code for recording
  ffmpegRecordProcess.on('close', (code) => {
    console.log(`[FFmpeg Record] Process exited with code ${code}`);
    if (code !== 0) {
      console.error(`[FFmpeg Record Error] FFmpeg exited with error code ${code}`);
    }
  });

  // Log the complete FFmpeg command for HLS
  console.log(`Running FFmpeg for HLS with the following command:`);
  console.log(`${ffmpegPath} ${hlsArgs.join(' ')}`);

  // Spawn the FFmpeg process for HLS streaming
  const ffmpegHlsProcess = spawn(ffmpegPath, hlsArgs);

  // Log FFmpeg output for debugging
  ffmpegHlsProcess.stdout.on('data', (data) => {
    console.log(`[FFmpeg HLS] stdout: ${data}`);
  });

  ffmpegHlsProcess.stderr.on('data', (data) => {
    console.error(`[FFmpeg HLS] stderr: ${data}`);
  });

  // Log FFmpeg exit code for HLS process..
  ffmpegHlsProcess.on('close', (code) => {
    console.log(`[FFmpeg HLS] Process exited with code ${code}`);
    if (code !== 0) {
      console.error(`[FFmpeg HLS Error] FFmpeg exited with error code ${code}`);
    }
  });
});

nms.on('donePublish', (id, streamPath, args) => {
  console.log(`[NodeMediaServer] Stream stopped: id=${id}, streamPath=${streamPath}`);
});
