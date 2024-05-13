const { getSrtFromS3, generateClipsFromSrt, generateEmail } = require('./index');
const { expect } = require('chai');

describe('getSrtFromS3', () => {
  it('should retrieve SRT file contents from S3', async () => {
    const bucketName = 'XXXXXXXXXXXXXX';
    const srtFileKey = 'test-video.srt';
    const expectedSrtContents = `
1
00:00:12,000 --> 00:00:15,000
This is the first subtitle line.

2
00:00:16,000 --> 00:00:18,000
And this is the second subtitle line.
`;

    const srtContents = await getSrtFromS3(bucketName, srtFileKey);
    expect(srtContents).to.equal(expectedSrtContents);
  });

  // Add more test cases for invalid input or error scenarios
});

describe('generateClipsFromSrt', () => {
  it('should generate clips from SRT file contents', async () => {
    const srtFileContents = `
1
00:00:12,000 --> 00:00:15,000
This is the first subtitle line.

2
00:00:16,000 --> 00:00:18,000
And this is the second subtitle line.
`;

    const expectedClips = [
      {
        title: 'Clip 1',
        description: 'This is the first subtitle line.',
        startTimeSeconds: 12,
        duration: 3,
      },
      {
        title: 'Clip 2',
        description: 'And this is the second subtitle line.',
        startTimeSeconds: 16,
        duration: 2,
      },
    ];

    const clips = await generateClipsFromSrt(srtFileContents);
    expect(clips).to.deep.equal(expectedClips);
  });

  // Add more test cases for invalid input or error scenarios
});

describe('generateEmail', () => {
  it('should generate an HTML email with clips', () => {
    const videoUrl = 'https://example.com/video.mp4';
    const clips = [
      {
        title: 'Test Clip 1',
        description: 'This is a test clip description.',
        startTimeSeconds: 12,
        duration: 3,
      },
      {
        title: 'Test Clip 2',
        description: 'Another test clip description.',
        startTimeSeconds: 16,
        duration: 2,
      },
    ];

    const expectedEmailHtml = `<html><body style="font-family: Arial, sans-serif;">
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <h2><a href="${videoUrl}&t=12s" style="text-decoration: none; color: #0056b3;">Test Clip 1</a></h2>
        <p>This is a test clip description.</p>
        <p><strong>Duration:</strong> 3 seconds</p>
      </div>
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <h2><a href="${videoUrl}&t=16s" style="text-decoration: none; color: #0056b3;">Test Clip 2</a></h2>
        <p>Another test clip description.</p>
        <p><strong>Duration:</strong> 2 seconds</p>
      </div>
    </body></html>`;

    const emailHtml = generateEmail(videoUrl, clips);
    expect(emailHtml).to.equal(expectedEmailHtml);
  });

  // Add more test cases for invalid input or error scenarios
});
