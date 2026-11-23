import pathlib, re
text = pathlib.Path('workers/api/src/index.ts').read_text(encoding='utf-8')
lines = text.splitlines()
matches = [(i+1, l) for i, l in enumerate(lines) if re.search(r'generateEmbedding|HEUER_EMBEDDING|v3.*embed|embed.*v3|knowledge.*object', l, re.I)]
for ln, content in matches:
    print(f'Line {ln}: {content.strip()[:120]}')
