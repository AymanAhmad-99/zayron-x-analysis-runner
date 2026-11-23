"""Create a deterministic local chunk plan and bounded JSONL payloads."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def h(text: str) -> str: return hashlib.sha256(text.encode("utf-8")).hexdigest()
def entry(o): return (str(o.get("object_id", "")), str(o.get("document_id", "")), str(o.get("content_hash") or o.get("integrity", {}).get("content_hash", "")))

def main():
    p=argparse.ArgumentParser(); p.add_argument("--input",nargs="+",required=True); p.add_argument("--output",required=True); p.add_argument("--chunk-size",type=int,default=500); a=p.parse_args()
    rows=[]
    for name in a.input:
        for line in Path(name).read_text(encoding="utf-8-sig").splitlines():
            if line.strip(): rows.append(json.loads(line))
    rows.sort(key=lambda x: x.get("object_id", ""))
    all_digest=h("\n".join("\t".join(entry(x)) for x in rows))
    out=Path(a.output); out.mkdir(parents=True,exist_ok=True); chunks=[]
    for i in range(0,len(rows),a.chunk_size):
        part=rows[i:i+a.chunk_size]; ordinal=i//a.chunk_size
        digest=h("\n".join("\t".join(entry(x)) for x in part)); chunk_id=f"chunk:{all_digest[:24]}:{ordinal:06d}"
        path=out/f"{chunk_id.replace(':','_')}.objects.jsonl"; path.write_text("\n".join(json.dumps(x,ensure_ascii=False,separators=(",",":")) for x in part)+"\n",encoding="utf-8")
        chunks.append({"chunk_id":chunk_id,"chunk_ordinal":ordinal,"object_count":len(part),"chunk_digest":digest,"path":str(path)})
    plan={"object_count":len(rows),"object_set_digest":all_digest,"chunk_size":a.chunk_size,"chunk_count":len(chunks),"chunks":chunks}
    (out/"plan.json").write_text(json.dumps(plan,indent=2)+"\n",encoding="utf-8"); print(json.dumps(plan,indent=2))
if __name__ == "__main__": main()
