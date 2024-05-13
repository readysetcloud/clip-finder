const express = require('express');
const ytdl = require('ytdl-core');
const { Transcriptions } = require('./src/transcriptions');
const { FileManager } = require('./src/file-manager');
const { SFNClient, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn');

const sfn = new SFNClient();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(8000, () => { console.log('listening on port 8000'); });

app.post('/videos', async (req, res) => {
  const taskToken = req.headers['task-token'];
  try {
    const { url: videoUrl } = req.body;
    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ message: 'Invalid or missing video URL' });
    }

    const videoInfo = await ytdl.getInfo(videoUrl);
    if (!videoInfo) {
      return res.status(404).send('Invalid video URL');
    }

    const fileId = FileManager.getSafeFilename(videoInfo.videoDetails.title);
    const fileExists = await FileManager.exists(fileId);

    const response = {
      status: 'Downloaded',
      video: {
        title: videoInfo.videoDetails.title,
        id: fileId
      }
    };

    if (fileExists) {
      const transcriptionFile = await Transcriptions.get(fileId);
      if (transcriptionFile) {
        response.status = 'Completed';
        response.transcription = { location: transcriptionFile };
      }

      res.status(200).json(response);
    } else {
      response.status = 'Downloading';
      res.status(202).json(response)
      await FileManager.save(videoUrl, videoInfo, fileId);
      Transcriptions.start(fileId);
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Something went wrong');

    if (taskToken) {
      await sfn.send(new SendTaskSuccessCommand({
        taskToken: taskToken,
        output: JSON.stringify({
          status: 'FAILED',
          reason: err
        })
      }));
    }
  }
});
