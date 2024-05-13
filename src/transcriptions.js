const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, OutputLocationType } = require('@aws-sdk/client-transcribe');
const { SFNClient, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn');
const { FileManager } = require('./file-manager');

const transcribe = new TranscribeClient();
const sfn = new SFNClient();

const TRANSCRIPTION_JOB_POLL_TIMER = 10000; // 10 seconds

const start = async (fileId, taskToken) => {
  try {
    console.log(`Begin transcribing: ${fileId}`);

    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: `${fileId}-${new Date().toISOString()}`,
      LanguageCode: 'en-US',
      MediaFormat: 'mp4',
      Media: {
        MediaFileUri: `s3://${process.env.BUCKET_NAME}/${fileId}`
      },
      Subtitles: {
        Formats: ['srt']
      },
      OutputBucketName: process.env.BUCKET_NAME,
      OutputKey: getTranscriptionFilename(fileId),
      OutputLocationType: OutputLocationType.S3
    }));

    const checkStatus = setInterval(async () => {
      const { TranscriptionJob } = await transcribe.send(new GetTranscriptionJobCommand({
        TranscriptionJobName: fileId
      }));

      if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
        console.info('Transcription complete:', TranscriptionJob);
        clearInterval(checkStatus);
        resumeWorkflow(taskToken, {
          status: 'SUCCEEDED',
          srtFilename
        });
      } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
        console.error('Transcription failed:', TranscriptionJob);
        clearInterval(checkStatus);
        resumeWorkflow(taskToken, {
          status: 'FAILED',
          reason: 'TRANSCRIPTION_JOB_FAILED'
        });
      }
    }, TRANSCRIPTION_JOB_POLL_TIMER);

  } catch (err) {
    console.error('Error transcribing video:', err);
    resumeWorkflow(taskToken, {
      status: 'FAILED',
      reason: 'START_TRANSCRIPTION_FAILED'
    });
  }
};

const get = async (fileId) => {
  const srtFilename = getTranscriptionFilename(fileId);
  if (await FileManager.exists(srtFilename))
    return srtFilename;
};

const getTranscriptionFilename = (fileId) => {
  return fileId.replace('.mp4', '.srt');
};

const resumeWorkflow = async (taskToken, data) => {
  if (taskToken) {
    await sfn.send(new SendTaskSuccessCommand({
      taskToken: taskToken,
      output: JSON.stringify(data)
    }));
  }
};

exports.Transcriptions = {
  start,
  get
};
