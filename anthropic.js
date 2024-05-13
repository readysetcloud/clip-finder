require('dotenv').config();
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic();

async function run() {
  const transcript = fs.readFileSync('./lib/transcript.srt', { encoding: 'utf8' });
  const msg = await anthropic.messages.create({
    //model: "claude-3-opus-20240229",
    //model: "claude-3-sonnet-20240229",
    model: "claude-3-haiku-20240307",
    max_tokens: 5000,
    system: 'You are an expert summarizer and content creator. When given a transcript, you can identify the most informative, educational, and funny clips',
    messages: [
      {
        role: "user",
        content: `Here is a transcript from a livestream. Find the 10 best clips focused on tech keeping them from 15 to 45 seconds. Structure your output only as JSON format as an array of objects with properties startTime, endTime, summary. Transcript: ${transcript}`
      }
    ],
  });
  console.log(msg);
  const data = msg.content[0].text;

  const clipString = data.match(/\[\s*{[^[]*}\s*\]/)[0];
  const clips = JSON.parse(clipString);
  fs.writeFile('clips', JSON.stringify(clips, null, 2));
  console.log(clips);
};



run();
