import { writeFileSync } from "fs";
import existingGhs from "../src/data/ghs-hymns.json";
import type { Hymn, HymnStanza } from "../src/types/hymn";

async function main() {
  console.log("Existing GHS hymns:", existingGhs.length);
  const allHymns: Hymn[] = [...(existingGhs as Hymn[])];
  const seenTitles = new Set(allHymns.map((h) => h.title.toLowerCase().trim()));

  // 1. Fetch CAC GHB (1,001 classic hymns)
  console.log("Fetching CAC GHB (1,001 hymns)...");
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/ebena107/HymnFlow/master/hymn-bundle/cac_ghb.json"
    );
    if (res.ok) {
      const cacData = (await res.json()) as any[];
      let added = 0;
      for (const item of cacData) {
        const title = (item.title || "Untitled Hymn").trim();
        const num = item.metadata?.number;
        const hymnId = `cac-ghb-${num || allHymns.length + 1}`;

        const stanzas: HymnStanza[] = [];
        let sIdx = 0;

        if (Array.isArray(item.verses)) {
          for (const vText of item.verses) {
            sIdx++;
            const lines = String(vText)
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.length > 0) {
              stanzas.push({
                id: `${hymnId}-v${sIdx}`,
                type: "verse",
                label: `Verse ${sIdx}`,
                lines,
              });
            }
          }
        }

        if (item.chorus && String(item.chorus).trim()) {
          const chorusLines = String(item.chorus)
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          if (chorusLines.length > 0) {
            stanzas.push({
              id: `${hymnId}-chorus`,
              type: "chorus",
              label: "Chorus",
              lines: chorusLines,
            });
          }
        }

        if (stanzas.length > 0) {
          allHymns.push({
            id: hymnId,
            number: num,
            title: title.replace(/^[\d\.\s\-]+/, ""),
            author: item.author || "Christian Classic Hymnal",
            category: "Classic Hymn",
            stanzas,
            createdAt: 1,
            source: "builtin",
          });
          added++;
        }
      }
      console.log(`Added ${added} hymns from CAC GHB! Current total: ${allHymns.length}`);
    }
  } catch (e) {
    console.error("Failed to fetch CAC GHB:", e);
  }

  // 2. Fetch Believers Hymn Book (465 hymns)
  console.log("Fetching Believers Hymn Book (465 hymns)...");
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/josmithua/song-data/master/bhb_songs.json"
    );
    if (res.ok) {
      const bhbData = (await res.json()) as any[];
      let added = 0;
      for (const item of bhbData) {
        const title = (item.title || "").trim();
        const num = item.id;
        const hymnId = `bhb-${num || allHymns.length + 1}`;

        const stanzas: HymnStanza[] = [];
        let vNum = 1;

        if (Array.isArray(item.verses)) {
          for (const vLines of item.verses) {
            if (Array.isArray(vLines) && vLines.length > 0) {
              stanzas.push({
                id: `${hymnId}-v${vNum}`,
                type: "verse",
                label: `Verse ${vNum++}`,
                lines: vLines.map((l: any) => String(l).trim()).filter(Boolean),
              });
            }
          }
        }

        if (Array.isArray(item.chorus) && item.chorus.length > 0) {
          stanzas.push({
            id: `${hymnId}-chorus`,
            type: "chorus",
            label: "Chorus",
            lines: item.chorus.map((l: any) => String(l).trim()).filter(Boolean),
          });
        }

        if (stanzas.length > 0) {
          allHymns.push({
            id: hymnId,
            number: num ? num + 1000 : undefined,
            title,
            author: item.author || "Believers Hymnal",
            category: "Worship & Praise",
            stanzas,
            createdAt: 1,
            source: "builtin",
          });
          added++;
        }
      }
      console.log(`Added ${added} hymns from BHB! Current total: ${allHymns.length}`);
    }
  } catch (e) {
    console.error("Failed to fetch BHB:", e);
  }

  // 3. Fetch Sacred Songs for Singing Saints (214 hymns)
  console.log("Fetching Sacred Songs for Singing Saints (214 hymns)...");
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/josmithua/song-data/master/ssfss_songs.min.json"
    );
    if (res.ok) {
      const ssfssData = (await res.json()) as any[];
      let added = 0;
      for (const item of ssfssData) {
        const title = (item.title || "").trim();
        const num = item.id;
        const hymnId = `ssfss-${num || allHymns.length + 1}`;

        const stanzas: HymnStanza[] = [];
        let vNum = 1;

        if (Array.isArray(item.verses)) {
          for (const vLines of item.verses) {
            if (Array.isArray(vLines) && vLines.length > 0) {
              stanzas.push({
                id: `${hymnId}-v${vNum}`,
                type: "verse",
                label: `Verse ${vNum++}`,
                lines: vLines.map((l: any) => String(l).trim()).filter(Boolean),
              });
            }
          }
        }

        if (Array.isArray(item.chorus) && item.chorus.length > 0) {
          stanzas.push({
            id: `${hymnId}-chorus`,
            type: "chorus",
            label: "Chorus",
            lines: item.chorus.map((l: any) => String(l).trim()).filter(Boolean),
          });
        }

        if (stanzas.length > 0) {
          allHymns.push({
            id: hymnId,
            number: num ? num + 1500 : undefined,
            title,
            author: item.author || "Singing Saints",
            category: "Gospel & Praise",
            stanzas,
            createdAt: 1,
            source: "builtin",
          });
          added++;
        }
      }
      console.log(`Added ${added} hymns from SSFSS! Current total: ${allHymns.length}`);
    }
  } catch (e) {
    console.error("Failed to fetch SSFSS:", e);
  }

  // 4. Fetch CAC YHB (Yoruba Hymns, 997 hymns)
  console.log("Fetching CAC YHB (997 hymns)...");
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/ebena107/HymnFlow/master/hymn-bundle/cac_yhb.json"
    );
    if (res.ok) {
      const yhbData = (await res.json()) as any[];
      let added = 0;
      for (const item of yhbData) {
        const title = (item.title || "Orin").trim();
        const num = item.metadata?.number;
        const hymnId = `cac-yhb-${num || allHymns.length + 1}`;

        const stanzas: HymnStanza[] = [];
        let sIdx = 0;

        if (Array.isArray(item.verses)) {
          for (const vText of item.verses) {
            sIdx++;
            const lines = String(vText)
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.length > 0) {
              stanzas.push({
                id: `${hymnId}-v${sIdx}`,
                type: "verse",
                label: `Ese ${sIdx}`,
                lines,
              });
            }
          }
        }

        if (item.chorus && String(item.chorus).trim()) {
          const chorusLines = String(item.chorus)
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          if (chorusLines.length > 0) {
            stanzas.push({
              id: `${hymnId}-chorus`,
              type: "chorus",
              label: "Egbe",
              lines: chorusLines,
            });
          }
        }

        if (stanzas.length > 0) {
          allHymns.push({
            id: hymnId,
            number: num ? num + 2000 : undefined,
            title: `[Orin ${num || sIdx}] ${title.replace(/^[\d\.\s\-]+/, "")}`,
            author: item.author || "Iwe Orin Mimo",
            category: "Indigenous Hymnal",
            stanzas,
            createdAt: 1,
            source: "builtin",
          });
          added++;
        }
      }
      console.log(`Added ${added} hymns from CAC YHB! Grand Total: ${allHymns.length}`);
    }
  } catch (e) {
    console.error("Failed to fetch CAC YHB:", e);
  }

  // Renumber and sort nicely
  console.log(`Writing ${allHymns.length} bundled hymns to src/data/bundled-hymns.json...`);
  writeFileSync("src/data/bundled-hymns.json", JSON.stringify(allHymns));
  console.log("Successfully wrote bundled-hymns.json!");
}

main().catch(console.error);
