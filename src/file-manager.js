const fs = require('fs');
const ytdl = require('ytdl-core');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client();

const save = async (videoUrl, info, fileId) => {
  console.log('Starting download from YouTube');
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

  // Create a write stream to save the video
  const stream = fs.createWriteStream(fileId);

  // Pipe the video stream to the file
  ytdl(videoUrl, { format }).pipe(stream);

  return new Promise((resolve, reject) => {
    stream.on('finish', async () => {
      console.log('Download complete!');
      const successfullyUploaded = await upload(fileId);
      if (successfullyUploaded) {
        resolve(fileId);
      } else {
        reject('S3_UPLOAD_FAILED');
      }
    });

    stream.on('error', (err) => {
      console.error('Error downloading video:', err);
      reject('FAILED_TO_DOWNLOAD');
    });
  });
};

const exists = async (fileId) => {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileId
    }));

    return true;
  } catch (err) {
    if (err.name === 'NotFound') {
      return false;
    }

    throw err;
  }
};

const upload = async (fileId) => {
  try {
    console.log('Uploading video to S3...');
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileId,
      Body: fs.createReadStream(fileId)
    }));

    return true;
  } catch (err) {
    console.error('Error uploading video to S3:', err);
  }
};

const getSafeFilename = (title) => {
  return `${title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '')}.mp4`;
};

exports.FileManager = { save, exists, getSafeFilename };
