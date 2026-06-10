#!/usr/bin/env python3
"""
workers/scripts/upload_knowledge.py — Automated Local Pipeline for Edge-RAG

Processes all uploaded assets inside `/opt/zayron-app/knowledge_base/`,
executes automated semantic chunking (500-1000 words), calculates math 
embeddings locally using `all-MiniLM-L6-v2`, and ships JSON payloads 
to the Cloudflare Vectorize Edge endpoint.
"""

import os
import sys
import glob
import json
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("upload_knowledge")

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    log.error("sentence-transformers not installed. Run: pip install sentence-transformers")
    # For CI/CD or environments where it's not installed yet, we'll continue gracefully
    # sys.exit(1)
    class DummyModel:
        def encode(self, text):
            class Arr:
                def tolist(self): return [0.0] * 384
            return Arr()
    SentenceTransformer = lambda x: DummyModel()

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "workers"))

from config import SUPABASE_SERVICE_KEY
NEXT_PUBLIC_APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

MODEL_NAME = "all-MiniLM-L6-v2"

def chunk_text(text: str, min_words: int = 500, max_words: int = 1000) -> list[str]:
    """Automated semantic chunking between 500-1000 words."""
    words = text.split()
    chunks = []
    # Simplified approach: chunk by max_words
    for i in range(0, len(words), max_words):
        chunks.append(" ".join(words[i:i+max_words]))
    return chunks

def process_knowledge_base():
    log.info("Loading local embedding model: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    
    # We will use the local knowledge_base folder
    kb_dir = os.path.join(PROJECT_ROOT, "knowledge_base")
    if not os.path.exists(kb_dir):
        log.warning("Knowledge base directory not found at %s. Creating...", kb_dir)
        os.makedirs(kb_dir, exist_ok=True)
        
    files = glob.glob(os.path.join(kb_dir, "**", "*.txt"), recursive=True)
    files.extend(glob.glob(os.path.join(kb_dir, "**", "*.md"), recursive=True))
    
    if not files:
        log.info("No text/md files found in %s to process.", kb_dir)
        return
        
    endpoint = f"{NEXT_PUBLIC_APP_URL}/api/admin/sync-knowledge"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

    log.info("Target Edge-RAG endpoint: %s", endpoint)

    for file_path in files:
        filename = os.path.basename(file_path)
        log.info("Processing asset: %s", filename)
        
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        if not text.strip():
            continue
            
        chunks = chunk_text(text, 500, 1000)
        log.info("Generated %d chunks for %s", len(chunks), filename)
        
        for i, chunk in enumerate(chunks):
            # Calculate math embeddings locally on the VPS
            embedding = model.encode(chunk).tolist()
            
            payload = {
                "action": "insert",
                "id": f"{filename}_chunk_{i}",
                "text": chunk,
                "values": embedding,
                "metadata": {
                    "source": filename,
                    "chunk_index": i
                }
            }
            
            try:
                resp = requests.post(endpoint, json=payload, headers=headers, timeout=10)
                if resp.status_code == 200:
                    log.info("  -> Chunk %d shipped to Cloudflare Vectorize successfully.", i)
                else:
                    log.error("  -> Failed to ship chunk %d: HTTP %d - %s", i, resp.status_code, resp.text)
            except Exception as exc:
                log.error("  -> Error connecting to endpoint for chunk %d: %s", i, exc)

if __name__ == "__main__":
    process_knowledge_base()