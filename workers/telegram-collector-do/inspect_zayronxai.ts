import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const loginStatePath = path.resolve(__dirname, '../../scripts/.tg_login_state.json');
  if (!fs.existsSync(loginStatePath)) {
    console.error('Login state not found at', loginStatePath);
    return;
  }
  const loginState = JSON.parse(fs.readFileSync(loginStatePath, 'utf8'));
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const stringSession = new StringSession(loginState.session_str);

  console.log('Connecting to Telegram MTProto...');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 3,
  });

  await client.connect();
  console.log('Connected successfully!');

  try {
    const channel = await client.getEntity('zayronxai');
    console.log('--- CHANNEL METADATA ---');
    console.log('ID:', (channel as any).id?.toString());
    console.log('Title:', (channel as any).title);
    console.log('Username:', (channel as any).username);
    console.log('Date Created:', (channel as any).date ? new Date((channel as any).date * 1000).toISOString() : 'Unknown');
    console.log('Participants Count:', (channel as any).participantsCount);

    // Fetch messages / history
    const messages = await client.getMessages(channel, { limit: 50 });
    console.log('\n--- HISTORICAL POSTS ---');
    console.log('Total messages retrieved:', messages.length);
    console.log('Total message count on entity:', (messages as any).total ?? messages.length);

    if (messages.length === 0) {
      console.log('The channel has 0 messages. It is completely empty.');
    } else {
      messages.forEach((m, idx) => {
        console.log(`\n[${idx + 1}] ID: ${m.id} | Date: ${new Date(m.date * 1000).toISOString()}`);
        console.log(`Text: ${(m.text || '').slice(0, 150)}...`);
      });
    }
  } catch (err) {
    console.error('Failed to get entity or messages:', err);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
