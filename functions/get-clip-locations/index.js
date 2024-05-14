const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const bedrock = new BedrockRuntimeClient();

const s3 = new S3Client();

exports.handler = async (state) => {
  const { srtFilename } = state;
  const data = await loadSrt(srtFilename);
  const clips = await getClipsFromLLM(JSON.stringify(data));

  return { clips };
};

const loadSrt = async (srtFilename) => {
  console.log(srtFilename);
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: srtFilename
  }));

  const output = await response.Body.transformToString();
  return JSON.parse(output).results.items
    .filter(i => i.type == 'pronunciation')
    .map(i => {
      return {
        startTime: i.start_time,
        text: i.alternatives[0].content
      };
    });
};

const getClipsFromLLM = async (transcript) => {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      max_tokens: 100000,
      anthropic_version: "bedrock-2023-05-31",
      messages: [
        {
          role: "user",
          content: [{
            type: "text",
            text: getPrompt(transcript)
          }]
        }
      ]
    })
  }));

  const answer = JSON.parse(new TextDecoder().decode(response.body));
  const aiResponse = answer.content[0].text;
  console.log(aiResponse);

  return getFormattedResponse(aiResponse);
};

const getFormattedResponse = (response) => {
  const regex = /<result>([\s\S]*?)<\/result>/;
  const matches = regex.exec(response);
  if (matches && matches[1]) {
      try {
          const jsonObj = JSON.parse(matches[1].trim());
          return jsonObj;
      } catch (e) {
          console.error('Failed to parse JSON:', e);
      }
  } else {
      console.warn('No <result> tag found or content is empty');
  }
};

const getPrompt = (transcript) => {
  const prompt = `Here is the transcript of a dialog between multiple people experimenting with tech:

  <transcript>
  ${transcript}
  </transcript>

  Your goal is to extract the best 30-45 second clips from this transcript that contain the most educational and informative content. The best clips will be ones that share insightful comments, key takeaways, interesting points, or useful tidbits of knowledge.

  First, carefully read through the entire transcript, paying attention to where the most substantive discussions occur.

  In a <scratchpad>, identify 12-15 candidate clips by writing out:
  - The key point or takeaway of that clip in 1-2 sentences
  - The approximate start time of the clip in seconds
  - The approximate duration of the clip in seconds

  After listing out the candidate clips, narrow it down to the top 8-10 best ones. The best clips should be the most densely packed with interesting and educational content.

  Provide the final result in the following format:
  <result>
  [
    {
      "summary": "1-2 sentence summary of clip #1",
      "start": start time of clip #1 in seconds,
      "duration": duration of clip in seconds
    },
    {
      "summary": "1-2 sentence summary of clip #2",
      "start": start time of clip #2 in seconds,
      "duration": duration of clip in seconds
    },
    ...
  ]
  </result>

  Remember, the final array should contain only the 8-10 best clips, with a short summary, start time, and duration for each. The start and duration times can be approximate, but try to get them within 5-10 seconds of when the relevant part of the clip begins.`;

  return prompt;
};
