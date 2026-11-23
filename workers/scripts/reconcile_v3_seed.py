"""Read-only local reconciliation for a deterministic chunk plan and payload artifacts."""
import argparse, hashlib, json
from pathlib import Path

def entry(o):
    return (str(o.get('object_id','')), str(o.get('document_id','')), str(o.get('content_hash') or o.get('integrity',{}).get('content_hash','')))
def digest(rows):
    return hashlib.sha256('\n'.join('\t'.join(entry(x)) for x in sorted(rows,key=lambda x:x.get('object_id',''))).encode()).hexdigest()
def main():
    p=argparse.ArgumentParser(); p.add_argument('--plan',required=True); p.add_argument('--payload-root',required=True); a=p.parse_args()
    plan=json.loads(Path(a.plan).read_text())
    results=[]; all_rows=[]
    for c in plan['chunks']:
        path=Path(a.payload_root)/Path(c['path']).name
        if not path.exists(): results.append({'chunk_id':c['chunk_id'],'status':'UNVERIFIED','reason':'PAYLOAD_MISSING'}); continue
        rows=[json.loads(x) for x in path.read_text(encoding='utf-8-sig').splitlines() if x.strip()]
        ids=[x.get('object_id') for x in rows]
        actual=hashlib.sha256('\n'.join('\t'.join(entry(x)) for x in rows).encode()).hexdigest()
        ok=len(rows)==c['object_count'] and len(ids)==len(set(ids)) and actual==c['chunk_digest']
        results.append({'chunk_id':c['chunk_id'],'status':'MATCH' if ok else 'MISMATCH','object_count':len(rows),'digest':actual})
        all_rows.extend(rows)
    reconstructed=digest(all_rows)
    print(json.dumps({'status':'MATCH' if reconstructed==plan['object_set_digest'] and all(x['status']=='MATCH' for x in results) else 'MISMATCH','object_count':len(all_rows),'object_set_digest':reconstructed,'expected':plan['object_set_digest'],'chunks':results},indent=2))
if __name__=='__main__': main()
