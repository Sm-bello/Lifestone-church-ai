import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function run() {
  try {
    const defaultText = `Lifestone is free, open-source church presentation software that listens to live sermons and detects Bible verses in real time.\n\nDownload for Windows, Mac, and Linux: https://lifestone-church-ai.vercel.app/\n\n#Lifestone #ChurchTech #AI #ChristianTech`;
    
    // Check if a specific message was passed via command line
    const text = process.argv[2] || defaultText;
    
    console.log(`Attempting to tweet: "${text}"`);
    const response = await client.v2.tweet(text);
    console.log('Tweet posted successfully!', response.data);
  } catch (error) {
    console.error('Error posting tweet:', error);
    process.exit(1);
  }
}

run();
