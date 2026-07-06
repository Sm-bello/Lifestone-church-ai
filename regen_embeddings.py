import numpy as np
import sqlite3
import os
from pathlib import Path

# Connect to Bible DB
db_path = 'data/lifestone.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all verses
cursor.execute("SELECT id, book, chapter, verse, text FROM verses")
verses = cursor.fetchall()
print(f"Loaded {len(verses)} verses from database")

# For now, create a placeholder embedding file with correct dimensions
# The actual embedding generation needs the ONNX runtime, which we'll do in Rust
# But we can at least create a properly-sized file so the app doesn't crash

# MiniLM outputs 384-dim embeddings
dim = 384
num_verses = len(verses)

# Create zero embeddings (will be overwritten by Rust on first run, or we can trigger regeneration)
embeddings = np.zeros((num_verses, dim), dtype=np.float32)

# Save in the expected format
np.save('data/verse_embeddings.npy', embeddings)
print(f"Created placeholder embeddings: {num_verses} x {dim}")

# Also update the meta file or clear it so Rust regenerates
if os.path.exists('data/embeddings_meta.json'):
    os.remove('data/embeddings_meta.json')
    print("Removed old embeddings meta")

conn.close()
