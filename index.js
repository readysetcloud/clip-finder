const express = require('express');
const fs = require('fs');
const ytdl = require('ytdl-core');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { TranscribeClient, StartTranscriptionJobCommand, OutputLocationType } = require('@aws-sdk/client-transcribe');
const s3 = new S3Client();
const transcribe = new TranscribeClient();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(8000, () => { console.log('listening on port 8000'); });

app.post('/videos', async (req, res) => {
  try {
    const { url: videoUrl } = req.body;

    const videoInfo = await ytdl.getInfo(videoUrl);
    if (!videoInfo) {
      return res.status(404).send('Invalid video URL');
    }

    res.status(202).send('Video downloading started');
    download(videoUrl, videoInfo);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Something went wrong');
  }
});

app.get('/clips', async (req, res) => {
  // get url from query param
  const { url: videoUrl } = req.query.url;
  const videoInfo = await ytdl.getInfo(videoUrl);
  if (!videoInfo) {
    return res.status(404).send('Invalid video URL');
  }
});

async function download(videoUrl, info) {
  console.log('Starting download');
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

  // Create a write stream to save the video
  const fileName = `${info.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/ /g, '')}.mp4`;
  const stream = fs.createWriteStream(fileName);

  // Pipe the video stream to the file
  ytdl(videoUrl, { format }).pipe(stream);

  stream.on('finish', async () => {
    console.log('Download complete!');
    const successfullyUploaded = await uploadToS3(fileName);
    if (successfullyUploaded) {
      transcribeVideo(fileName);
    }
  });

  stream.on('error', (err) => {
    console.error('Error downloading video:', err);
  });
}

async function uploadToS3(fileName) {
  try {
    console.log('Uploading video to S3...');
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileName,
      Body: fs.createReadStream(fileName)
    }));

    return true;
  } catch (err) {
    console.error('Error uploading video to S3:', err);
  }
}

async function transcribeVideo(fileName) {
  try {
    console.log('Transcribing video...');
    const transcription = await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: fileName,
      LanguageCode: 'en-US',
      MediaFormat: 'mp4',
      Media: {
        MediaFileUri: `s3://${process.env.BUCKET_NAME}/${fileName}`
      },
      Subtitles: {
        Formats: ['srt']
      },
      OutputBucketName: process.env.BUCKET_NAME,
      OutputKey: `${fileName}.srt`,
      OutputLocationType: OutputLocationType.S3
    }));

    console.log('Transcription complete:', transcription);
  } catch (err) {
    console.error('Error transcribing video:', err);
  }
}
