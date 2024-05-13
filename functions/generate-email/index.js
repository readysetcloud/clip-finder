const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const s3Client = new S3Client();
const bedrockClient = new BedrockRuntimeClient();

exports.handler = async (event) => {
  const { bucketName, srtFileKey } = event;

  try {
    const srtFileContents = await getSrtFromS3(bucketName, srtFileKey);
    const clips = await generateClipsFromSrt(srtFileContents);
    const { baseURL: videoUrl } = event;
    const emailHtml = generateEmail(videoUrl, clips);

    // Send or return the generated email HTML
    // e.g., return { body: emailHtml, statusCode: 200, headers: { 'Content-Type': 'text/html' } };
  } catch (err) {
    console.error('Error:', err);
    // Handle error appropriately
  }
};

const getSrtFromS3 = async (bucketName, srtFileKey) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: srtFileKey,
    };
    const data = await s3Client.send(new GetObjectCommand(params));
    const srtFileContents = Buffer.from(await data.Body.transformToByteArray()).toString('utf-8');
    return srtFileContents;
  } catch (err) {
    console.error('Error retrieving SRT file from S3:', err);
    throw err;
  }
};

const generateClipsFromSrt = async (srtFileContents) => {
  try {
    const response = await bedrockClient.consumeSrt(srtFileContents);
    const clips = response.clips.map(clip => ({
      title: clip.title,
      description: clip.description,
      startTimeSeconds: clip.startTime,
      duration: clip.duration,
    }));
    return clips;
  } catch (err) {
    console.error('Error generating clips from SRT:', err);
    throw err;
  }
};

const generateEmail = (videoUrl, data) => {
  let html = '<html><body style="font-family: Arial, sans-serif;">';

  data.forEach(item => {
    const videoURL = `${videoUrl}&t=${item.startTimeSeconds}s`;

    html += `
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <h2><a href="${videoURL}" style="text-decoration: none; color: #0056b3;">${item.title}</a></h2>
        <p>${item.description}</p>
        <p><strong>Duration:</strong> ${item.duration} seconds</p>
      </div>
    `;
  });

  html += '</body></html>';
  return html;
};
