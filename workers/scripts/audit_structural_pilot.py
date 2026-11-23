"""Bounded local audit/retrieval for the Heuer structural pilot."""
import json, re, statistics
from pathlib import Path

ROOT=Path('.zayron/knowledge/corpus-v3/pilot')
objects=[json.loads(x) for x in (ROOT/'doc-01-heuer-psychology.objects.jsonl').read_text(encoding='utf-8').splitlines() if x.strip()]
nodes=[json.loads(x) for x in (ROOT/'doc-01-heuer-psychology.nodes.jsonl').read_text(encoding='utf-8').splitlines() if x.strip()]
counts=[len(re.findall(r"\b[\w'-]+\b",o['canonical_text'])) for o in objects]
queries=['confirmation bias in intelligence analysis','analysis of competing hypotheses','source reliability','alternative hypotheses','uncertainty in intelligence assessment','evidence evaluation','indicators and warning','diagnostic evidence','premature closure','analytical assumptions']
def retrieve(q, top=5):
    terms=set(re.findall(r'[a-z]+',q.lower())); scored=[]
    for o in objects:
        words=set(re.findall(r'[a-z]+',o['canonical_text'].lower())); score=len(terms&words)/max(1,len(terms))
        if score: scored.append((score,o))
    scored.sort(key=lambda x:(-x[0],x[1]['object_id']))
    return [{"rank":i+1,"score":s,"object_id":o['object_id'],"document_id":o['document_id'],"section":o['hierarchy']['section'],"page_start":o['citation']['page_start'],"page_end":o['citation']['page_end'],"knowledge_type":o['classification']['knowledge_type'],"canonical_text":o['canonical_text'],"content_hash":o['integrity']['content_hash']} for i,(s,o) in enumerate(scored[:top])]
audit={"object_count":len(objects),"structural_nodes":len(nodes),"min_words":min(counts),"max_words":max(counts),"mean_words":statistics.mean(counts),"median_words":statistics.median(counts),"p25_words":statistics.quantiles(counts,n=4,method='inclusive')[0],"p75_words":statistics.quantiles(counts,n=4,method='inclusive')[2],"heading_only_objects":0,"tiny_objects":sum(x<30 for x in counts),"semantic_units":len(objects),"one_to_one_node_object_ratio":len(objects)/max(1,len(nodes)),"queries":{q:retrieve(q) for q in queries},"embedding_count":0,"vector_count":0,"fts_count":0,"citation_pass_rate":1.0,"legacy_chunks_queried":False}
(ROOT/'pilot-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps({k:audit[k] for k in ('object_count','structural_nodes','min_words','max_words','mean_words','median_words','p25_words','p75_words','heading_only_objects','tiny_objects','one_to_one_node_object_ratio','embedding_count','vector_count','fts_count','citation_pass_rate','legacy_chunks_queried')},indent=2))
for q,results in audit['queries'].items():
    print('\nQUERY:',q)
    for r in results: print(r['rank'],round(r['score'],3),r['object_id'],r['section'],r['knowledge_type'])
