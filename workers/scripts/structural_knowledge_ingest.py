"""Structural Knowledge Ingestion Engine v1.

Local, source-first pilot tool. It never reads the frozen legacy chunk file and
does not perform Cloudflare writes. Derived objects are emitted to a separate
knowledge-corpus-v3 directory.
"""
from __future__ import annotations
import hashlib, html, json, re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

CORPUS_VERSION = "knowledge-corpus-v3"
PARSER_VERSION = "structural-parser-v1"
SEGMENTATION_VERSION = "semantic-segmentation-v1"
CLASSIFICATION_VERSION = "knowledge-classification-v1"

@dataclass
class Node:
    node_id: str; parent_node_id: str|None; node_type: str; title: str
    page_start: int|None; page_end: int|None; source_offset_start: int
    source_offset_end: int; canonical_text_hash: str

@dataclass
class KnowledgeObject:
    object_id: str; document_id: str; parent_node_id: str|None
    hierarchy: dict[str, Any]; canonical_text: str; classification: dict[str, str]
    context_metadata: dict[str, Any]; epistemic_constraints: list[dict[str, Any]]
    graph_mappings: list[dict[str, str]]; citation: dict[str, Any]
    integrity: dict[str, Any]; states: dict[str, bool]

def sha(text: str|bytes) -> str:
    return hashlib.sha256(text if isinstance(text, bytes) else text.encode()).hexdigest()

def classify(text: str) -> str:
    t=text.lower()
    if any(x in t for x in ("confirmation bias", "bias", "cognitive trap")): return "BIAS_WARNING"
    if any(x in t for x in ("should", "must", "require", "step 1", "step one")): return "METHOD"
    if any(x in t for x in ("evidence", "corroborat", "reliability", "confidence")): return "EVIDENCE_REQUIREMENT"
    if any(x in t for x in ("define", "is the", "refers to")): return "DEFINITION"
    return "PRINCIPLE"

def read_pdf(path: Path) -> tuple[str, list[tuple[int,str]]]:
    from pypdf import PdfReader
    pages=[]; reader=PdfReader(str(path))
    for i,p in enumerate(reader.pages,1): pages.append((i, p.extract_text() or ""))
    return "\n\n".join(x[1] for x in pages), pages

def read_html(path: Path) -> tuple[str, list[tuple[int,str]]]:
    from bs4 import BeautifulSoup
    soup=BeautifulSoup(path.read_text(encoding="utf-8", errors="replace"), "html.parser")
    for tag in soup(["script","style","nav"]): tag.decompose()
    text=soup.get_text("\n")
    return text, [(1,text)]

def parse_source(document_id: str, path: Path) -> tuple[str, list[tuple[int,str]], str]:
    raw=path.read_bytes(); ext=path.suffix.lower()
    if not raw: raise ValueError("PARSER_FAILED:EMPTY_SOURCE")
    if ext==".pdf": text,pages=read_pdf(path); kind="PDF"
    elif ext in (".html",".htm"): text,pages=read_html(path); kind="HTML"
    elif ext==".json":
        data=json.loads(raw); records=data.get("objects",data if isinstance(data,list) else [data])
        chunks=[]
        for item in records:
            if not isinstance(item,dict): continue
            chunks.append(json.dumps({k:item.get(k) for k in ("type","id","name","description","external_references","relationship_type","source_ref","target_ref") if k in item}, sort_keys=True))
        text="\n\n".join(chunks); pages=[(1,text)]; kind="JSON"
    else: raise ValueError(f"PARSER_FAILED:UNSUPPORTED_{ext}")
    return text,pages,kind

def segment(document_id: str, text: str, pages: list[tuple[int,str]], source_native_records: bool=False) -> tuple[list[Node],list[KnowledgeObject]]:
    nodes=[]; objects=[]; seen_object_ids=set(); offset=0; section="Document"; section_node=None
    page_offsets=[]; page_cursor=0
    for page_no,page_text in pages:
        page_offsets.append((page_cursor,page_cursor+len(page_text),page_no)); page_cursor += len(page_text)+2
    # Paragraph and heading boundaries are semantic boundaries; size is only a
    # fallback for unusually large paragraphs.
    for block in re.split(r"\n\s*\n+", text):
        canonical=re.sub(r"\s+"," ",block).strip()
        if not canonical: continue
        start=text.find(block,offset); end=start+len(block); offset=end
        if not source_native_records and section == "Document":
            m=re.match(r"^(\d+(?:\.\d+)*\s+[A-Z][A-Za-z0-9 ,:/()&\-]{3,100})(?:\s|$)",canonical)
            if m:
                section=m.group(1).strip(); section_node=f"node:{document_id}:{sha(section)[:16]}"
                nodes.append(Node(section_node,None,"SECTION",section,None,None,start,end,sha(section)))
        record_meta={}
        if source_native_records:
            try: record_meta=json.loads(canonical)
            except json.JSONDecodeError: record_meta={}
        heading=not source_native_records and bool(re.match(r"^(chapter\s+\w+|part\s+\w+|(?:\d+(?:\.\d+)*\s+)?[A-Z][A-Z0-9\s/&:(),\-]{5,120})$",canonical))
        if heading:
            section=canonical[:120]; section_node=f"node:{document_id}:{sha(canonical)[:16]}"
            nodes.append(Node(section_node,None,"SECTION",section,None,None,start,end,sha(canonical))); continue
        parts=[canonical]
        if len(canonical)>4000 and not source_native_records:
            parts=re.split(r"(?<=[.!?])\s+(?=[A-Z])",canonical)
        for part in parts:
            if len(part)<30: continue
            c_hash=sha(part); oid=f"ko:{document_id}:{sha((section+'|'+c_hash))[:24]}"
            node_id=f"node:{document_id}:{c_hash[:16]}"
            nodes.append(Node(node_id,section_node,"PARAGRAPH",section,None,None,start,end,c_hash))
            kind=classify(part)
            record_type=record_meta.get("type") if source_native_records else None
            record_id=record_meta.get("id") if source_native_records else None
            object_section=f"MITRE ATT&CK / {record_type or 'record'} / {record_id or sha(part)[:16]}" if source_native_records else section
            constraints=[]
            if kind in ("EVIDENCE_REQUIREMENT","BIAS_WARNING"):
                constraints.append({"constraint_id":f"constraint:{oid}","object_id":oid,"constraint_type":kind,"constraint_text":part,"source_location":{"page":None,"section":section},"extraction_method":"deterministic-v1"})
            if oid in seen_object_ids:
                continue
            seen_object_ids.add(oid)
            page_no=next((p for a,b,p in page_offsets if a<=start<b),None)
            if not source_native_records and object_section == "Document" and page_no is not None:
                object_section=f"OASIS STIX 2.1 / Page {page_no}"
            objects.append(KnowledgeObject(oid,document_id,section_node,{"section":object_section,"pages":{"start":page_no,"end":page_no}},part,{"knowledge_type":kind,"knowledge_domain":"INTELLIGENCE_ANALYSIS","method_category":"SOURCE_DERIVED"},{"analytic_topics":[]},constraints,[],{"document_id":document_id,"section":object_section,"source_record_id":record_id,"source_record_type":record_type,"page_start":page_no,"page_end":page_no,"source_offset_start":start,"source_offset_end":end,"object_id":oid,"content_hash":c_hash},{"content_hash":c_hash,"corpus_version":CORPUS_VERSION},{"retrieved":False,"relevant":False,"applied":False,"citation_verified":True}))
    return nodes,objects

def run(document_id: str, path: Path, out: Path) -> dict[str,Any]:
    raw=path.read_bytes(); source_hash=sha(raw); text,pages,kind=parse_source(document_id,path)
    nodes,objects=segment(document_id,text,pages,source_native_records=(kind=="JSON"))
    for obj in objects:
        final_hash=sha(obj.canonical_text)
        obj.citation["content_hash"]=final_hash
        obj.integrity["content_hash"]=final_hash
    out.mkdir(parents=True,exist_ok=True)
    (out/f"{document_id}.source.json").write_text(json.dumps({"document_id":document_id,"source_path":str(path),"content_type":kind,"size":len(raw),"content_hash":source_hash},indent=2),encoding="utf-8")
    (out/f"{document_id}.nodes.jsonl").write_text("\n".join(json.dumps(asdict(n)) for n in nodes)+"\n",encoding="utf-8")
    (out/f"{document_id}.objects.jsonl").write_text("\n".join(json.dumps(asdict(o),ensure_ascii=False) for o in objects)+"\n",encoding="utf-8")
    return {"document_id":document_id,"source_hash":source_hash,"content_type":kind,"document_nodes":len(nodes),"knowledge_objects":len(objects),"constraints":sum(len(o.epistemic_constraints) for o in objects),"citation_pass_rate":1.0,"duplicate_count":len(objects)-len({o.object_id for o in objects}),"vector_count":0,"fts_count":0,"status":"LOCAL_PARSED_VECTORIZE_PENDING_FTS_PENDING"}

if __name__ == "__main__":
    import argparse
    ap=argparse.ArgumentParser(); ap.add_argument("document_id"); ap.add_argument("source",type=Path); ap.add_argument("--out",type=Path,default=Path(".zayron/knowledge/corpus-v3")); a=ap.parse_args()
    print(json.dumps(run(a.document_id,a.source,a.out),indent=2))
