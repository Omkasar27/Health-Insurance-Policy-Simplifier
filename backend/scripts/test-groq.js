import Groq from 'groq-sdk';
import { env } from '../src/config/env.js';

const groq = new Groq({ apiKey: env.groqApiKey });

const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Reply with exactly: setup working' }],
});

console.log(completion.choices[0].message.content);