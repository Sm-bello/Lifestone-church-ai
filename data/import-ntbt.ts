/**
 * Additive, idempotent importer for Spanish Nueva Traducción BibliaTodo (NTBT).
 * Imports NTBT from data/bibliatodo/ntbt/NTBT.sqlite into data/lifestone.db
 * without modifying, renaming, or reordering existing translations (IDs 1..10).
 *
 * Run: bun run data/import-ntbt.ts
 */

import { Database } from "bun:sqlite"
import { existsSync } from "node:fs"
import { join } from "node:path"

const DATA_DIR = import.meta.dir
const TARGET_DB_PATH = join(DATA_DIR, "lifestone.db")
const SOURCE_DB_PATH = join(DATA_DIR, "bibliatodo", "ntbt", "NTBT.sqlite")

const EXACT_CREDIT =
  "Santa Biblia, Nueva Traducción BibliaTodo (NTBT). Publicada por BibliaTodo Bible Society, sello editorial de BibliaTodo LLC. https://www.bibliatodo.org/es/ntbt/"
const OFFICIAL_URL = "https://www.bibliatodo.org/es/ntbt/"

function main() {
  if (!existsSync(TARGET_DB_PATH)) {
    console.log("⏭ data/lifestone.db not found, skipping NTBT import.")
    return
  }
  if (!existsSync(SOURCE_DB_PATH)) {
    throw new Error(`Missing official NTBT SQLite package at ${SOURCE_DB_PATH}`)
  }

  const targetDb = new Database(TARGET_DB_PATH)

  // 1. Ensure additive translation_metadata table exists
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS translation_metadata (
      translation_id INTEGER PRIMARY KEY REFERENCES translations(id),
      release_id TEXT NOT NULL,
      cutoff_date TEXT NOT NULL,
      edition TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      license_version TEXT NOT NULL,
      attribution TEXT NOT NULL,
      url TEXT NOT NULL
    );
  `)

  // 2. Check idempotency: is NTBT already imported and complete?
  const existing = targetDb
    .query("SELECT id FROM translations WHERE abbreviation = 'NTBT'")
    .get() as { id: number } | null

  if (existing) {
    const bookCount = (
      targetDb
        .query("SELECT COUNT(*) as c FROM books WHERE translation_id = ?")
        .get(existing.id) as { c: number }
    ).c
    const verseCount = (
      targetDb
        .query("SELECT COUNT(*) as c FROM verses WHERE translation_id = ?")
        .get(existing.id) as { c: number }
    ).c
    const metaRow = targetDb
      .query("SELECT release_id FROM translation_metadata WHERE translation_id = ?")
      .get(existing.id) as { release_id: string } | null

    if (bookCount === 66 && verseCount === 31104 && metaRow) {
      console.log(
        `✓ NTBT (id=${existing.id}, release=${metaRow.release_id}) already imported (${bookCount} books, ${verseCount} verses) — idempotent no-op.`
      )
      targetDb.close()
      return
    }
  }

  // 3. Open official NTBT.sqlite source read-only
  const sourceDb = new Database(SOURCE_DB_PATH, { readonly: true })

  const metaRows = sourceDb
    .query("SELECT clave, valor FROM metadatos")
    .all() as Array<{ clave: string; valor: string }>
  const metaMap = Object.fromEntries(metaRows.map((r) => [r.clave, r.valor]))

  const releaseId = metaMap.identificacion || "NTBT-2026-11-06"
  const cutoffDate = metaMap.fecha_corte || "2026-11-06"
  const edition = metaMap.edicion || "texto"
  const schemaVersion = metaMap.schema || "3"
  const licenseVersion = "1.7 (2026-11-12)"

  const libros = sourceDb
    .query("SELECT codigo, orden, nombre FROM libros ORDER BY orden ASC")
    .all() as Array<{ codigo: string; orden: number; nombre: string }>

  if (libros.length !== 66) {
    throw new Error(`Expected 66 books in NTBT.sqlite, found ${libros.length}`)
  }

  console.log(`\n📖 Importing NTBT (${releaseId}) into lifestone.db...`)

  targetDb.exec("BEGIN TRANSACTION")
  try {
    let translationId: number

    if (existing) {
      translationId = existing.id
      // Clean partial rows if a previous run was interrupted mid-way
      targetDb.run(
        "INSERT INTO verses_fts(verses_fts, rowid, text) SELECT 'delete', id, text FROM verses WHERE translation_id = ?",
        [translationId]
      )
      targetDb.run("DELETE FROM verses WHERE translation_id = ?", [translationId])
      targetDb.run("DELETE FROM books WHERE translation_id = ?", [translationId])
      targetDb.run("DELETE FROM translation_metadata WHERE translation_id = ?", [translationId])
    } else {
      targetDb.run(
        "INSERT INTO translations (abbreviation, title, language, license, is_copyrighted, is_downloaded) VALUES (?, ?, ?, ?, ?, ?)",
        [
          "NTBT",
          "Nueva Traducción BibliaTodo",
          "es",
          `BibliaTodo Free Use and Distribution Agreement v1.7 (${releaseId})`,
          0,
          1,
        ]
      )
      translationId = (
        targetDb.query("SELECT last_insert_rowid() as id").get() as { id: number }
      ).id
    }

    // Store release & attribution metadata
    targetDb.run(
      `INSERT OR REPLACE INTO translation_metadata
       (translation_id, release_id, cutoff_date, edition, schema_version, license_version, attribution, url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        translationId,
        releaseId,
        cutoffDate,
        edition,
        schemaVersion,
        licenseVersion,
        EXACT_CREDIT,
        OFFICIAL_URL,
      ]
    )

    const insertBook = targetDb.prepare(
      "INSERT INTO books (translation_id, book_number, name, abbreviation, testament) VALUES (?, ?, ?, ?, ?)"
    )
    const insertVerse = targetDb.prepare(
      "INSERT INTO verses (translation_id, book_id, book_number, book_name, book_abbreviation, chapter, verse, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    const selectVersesByBook = sourceDb.prepare(
      "SELECT capitulo, versiculo, texto FROM versiculos WHERE libro = ? ORDER BY capitulo ASC, versiculo ASC"
    )

    let totalVerses = 0

    for (const libro of libros) {
      const bookNumber = libro.orden
      const testament = bookNumber <= 39 ? "OT" : "NT"

      insertBook.run(translationId, bookNumber, libro.nombre, libro.codigo, testament)
      const bookId = (
        targetDb.query("SELECT last_insert_rowid() as id").get() as { id: number }
      ).id

      const versiculos = selectVersesByBook.all(libro.codigo) as Array<{
        capitulo: number
        versiculo: number
        texto: string
      }>

      for (const v of versiculos) {
        // Store v.texto verbatim without any stripping, normalization, or cleaning
        insertVerse.run(
          translationId,
          bookId,
          bookNumber,
          libro.nombre,
          libro.codigo,
          v.capitulo,
          v.versiculo,
          v.texto
        )
        totalVerses++
      }
    }

    // Index only the new NTBT rows into external-content FTS5 table verses_fts
    targetDb.run(
      "INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses WHERE translation_id = ?",
      [translationId]
    )

    // Verify FTS5 external-content integrity across the entire database
    targetDb.exec("INSERT INTO verses_fts(verses_fts) VALUES('integrity-check');")

    targetDb.exec("COMMIT")
    console.log(
      `✓ NTBT imported (id=${translationId}, release=${releaseId}): ${libros.length} books, ${totalVerses.toLocaleString()} verses, FTS5 integrity verified.`
    )
  } catch (err) {
    targetDb.exec("ROLLBACK")
    throw err
  } finally {
    sourceDb.close()
    targetDb.close()
  }
}

main()
