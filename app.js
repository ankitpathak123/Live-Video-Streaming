const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const outputDir = path.join(__dirname, 'public', 'hls');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/live', (req, res) => {
  const streamURL = 'rtmp://192.168.29.117:1935/live/stream';
  const outputPath = path.join(outputDir, 'stream.m3u8');

  ffmpeg(streamURL)
    .output(outputPath)
    .outputOptions([
      '-hls_time 10',
      '-hls_list_size 6',
      '-hls_flags delete_segments'
    ])
    .on('start', (commandLine) => {
      console.log('FFmpeg started:', commandLine);
    })
    .on('error', (err) => {
      console.error('Error during stream:', err);
      res.status(500).send('Stream error');
    })
    .on('end', () => {
      console.log('FFmpeg finished converting to HLS');
    })
    .run();

  res.send({ message: 'Live stream started' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
