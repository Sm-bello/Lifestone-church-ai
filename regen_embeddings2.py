import numpy as np
import sqlite3
import os

conn = sqlite3.connect('data/lifestone.db')
cursor = conn.cursor()
cursor.execute("SELECT id, book_name, chapter, verse, text FROM verses")
verses = cursor.fetchall()
print(f"Loaded {len(verses)} verses")

dim = 384
num_verses = len(verses)
embeddings = np.zeros((num_verses, dim), dtype=np.float32)
np.save('data/verse_embeddings.npy', embeddings)
print(f"Created placeholder embeddings: {num_verses} x {dim}")

if os.path.exists('data/embeddings_meta.json'):
    os.remove('data/embeddings_meta.json')
    print("Removed old embeddings meta")

conn.close()
