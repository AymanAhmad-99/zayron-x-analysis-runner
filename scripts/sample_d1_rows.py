import subprocess
import json

def query_d1(sql):
    cmd = f'npx wrangler d1 execute zayron-x-db --remote --json --command "{sql}"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    try:
        data = json.loads(res.stdout)
        return data[0]['results']
    except Exception as e:
        return f"ERR: {e}\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}"

output = {
    "articles": query_d1("SELECT id, title, slug, severity, confidence, published_at FROM articles LIMIT 10;"),
    "articles_non_en": query_d1("SELECT id, title, substr(content, 1, 100) as snip FROM articles WHERE title GLOB '*[а-яА-Я]*' OR title GLOB '*[ء-ي]*' LIMIT 10;"),
    "languages": query_d1("SELECT original_language, count(*) as count FROM source_messages GROUP BY original_language;"),
    "non_en_source_messages": query_d1("SELECT id, original_language, substr(raw_content, 1, 100) as raw_snip, substr(normalized_content, 1, 100) as norm_snip FROM source_messages WHERE original_language != 'en' LIMIT 10;"),
    "actors": query_d1("SELECT * FROM actors;"),
    "malware": query_d1("SELECT * FROM malware;"),
    "vulnerabilities": query_d1("SELECT * FROM vulnerabilities;"),
    "campaigns": query_d1("SELECT * FROM campaigns;"),
    "relations": query_d1("SELECT * FROM relations LIMIT 10;"),
    "ai_runs": query_d1("SELECT * FROM ai_runs LIMIT 5;"),
    "sources": query_d1("SELECT id, display_name, url, source_type, language, trust_score, status, last_seen_at FROM sources LIMIT 10;")
}

with open("scripts/d1_sample_output.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("SUCCESS: written to scripts/d1_sample_output.json")
