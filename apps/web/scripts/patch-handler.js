import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handlerFile = path.resolve(__dirname, '../.open-next/server-functions/default/apps/web/handler.mjs');

if (fs.existsSync(handlerFile)) {
  let content = fs.readFileSync(handlerFile, 'utf8');
  const target = 'getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}';
  if (content.includes(target)) {
    content = content.replace(target, 'getMiddlewareManifest(){return {middleware:{},sortedRoutes:[],functions:{}}}');
    fs.writeFileSync(handlerFile, content, 'utf8');
    console.log('✓ Successfully patched handler.mjs for workerd runtime compatibility');
  } else {
    console.log('✓ handler.mjs already patched or target not found');
  }
} else {
  console.log('ℹ handler.mjs not found (run opennextjs-cloudflare build first)');
}
