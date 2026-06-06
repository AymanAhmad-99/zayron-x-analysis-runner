async function test() {
  const prompts = [
    "cyber threat intelligence dark holographic network map",
    "cyber threat intelligence dark holographic network map --v 6.0",
    "cyber threat intelligence dark holographic network map octane render",
    "cyber threat intelligence dark holographic network map?enhance=true"
  ];
  
  for (const p of prompts) {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=800&height=450&nologo=true`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`Prompt: "${p}" -> HTTP Status: ${res.status}`);
    } catch (e) {
      console.error(e);
    }
  }
}
test();
