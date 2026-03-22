# Strategi: Organisering av mediefiler for Jellyfin multi-versjon

## 1. Nåværende oppsett

### Jellyfin-server
- **Versjon:** 10.11.6
- **Servernavn:** prodesk (Linux x64)
- **Adresse:** `http://100.114.52.11:8096`

### Biblioteker og lagringspunkter

| Bibliotek | Type | Lagringsstier |
|---|---|---|
| **Filmer** | movies | `/mnt/usb1/Filmer`, `/mnt/video/Filmer` |
| **TV-serier** | tvshows | `/mnt/usb1/TV-serier`, `/mnt/usb2/TV-serier`, `/mnt/video/TV-serier` |
| **Musikk** | music | `/mnt/music/Musikk` |
| **Hjemmevideoer** | homevideos | `/mnt/video/Hjemmevideoer` |

### Mengder

| Kategori | Antall | Fordeling |
|---|---|---|
| Filmer totalt | ~~944~~ **889** | usb1: ~770, video: 119 |
| TV-serier totalt | 143 | usb1: 67, video: 50, usb2: 26 |
| Filmer med duplikater (samme TMDB-ID) | ~90 grupper | ~90 ekte duplikater, ~~12~~ **0 CD-split** |
| TV-serier med duplikater (samme TMDB-ID) | 12 grupper | |

> **Sist verifisert:** 2026-03-21 — 55 filmer fjernet fra Jellyfin gjennom CD-split-stacking og Harry Potter multi-versjon-konsolidering.

---

## 2. Jellyfin multi-versjon: Slik fungerer det

Jellyfin støtter **flere versjoner av samme film** i én mappe. Når brukeren spiller av filmen, kan de velge mellom versjonene (f.eks. 1080p, 720p, DVD-kvalitet).

### Navnekonvensjon

Filene må ligge i **samme mappe** og ha **identisk basenavn**, med en label etter ` - ` (mellomrom-bindestrek-mellomrom):

```
/Filmer/
  The Matrix (1999)/
    The Matrix (1999) - 2160p.mkv        ← UHD Blu-ray
    The Matrix (1999) - 1080p.mkv         ← Blu-ray
    The Matrix (1999) - DVD.mkv           ← DVD-rip
```

### Regler
- Basenavnet **MÅ** være identisk (inkludert årstall og ev. metadata-ID)
- Versjons-label skilles med ` - ` (mellomrom, bindestrek, mellomrom)
- Labels som slutter på `p` eller `i` (f.eks. `1080p`, `720p`, `480i`) sorteres automatisk høyest-til-lavest
- Andre labels (f.eks. `DVD`, `Bluray`, `Remux`, `Rifftrax`) sorteres alfabetisk
- Labels kan valgfritt ha brackets: `The Matrix (1999) - [1080p].mkv`
- Stacking (CD1/CD2) og multi-versjon kan **IKKE** kombineres

---

## 3. Funn: Duplikater som bør konsolideres

### 3.1 Filmer — Ekte multi-versjon-duplikater (92 grupper)

De viktigste kategoriene:

#### A) James Bond-samlingen (17 filmer)
Nesten alle Bond-filmene har **to versjoner**: 1080p Blu-ray (~10-15 GB) og DVD-rip (~3-4 GB).

| Film | 1080p-sti | DVD-sti |
|---|---|---|
| Dr. No | `007.James.Bond.Complete.Collection.../Dr.NO.1962.1080p...mkv` | `DVD/James Bond DR NO/title00.mkv` |
| Casino Royale | `007.James.Bond.Complete.Collection.../Casino.Royale 2006.1080p...mkv` | `DVD/Casino_Royale/Casino_Royale_t00.mkv` |
| GoldenEye | `007.James.Bond.Complete.Collection.../Golden.Eye.1995.1080p...mkv` | `DVD/GoldenEye/title00.mkv` |
| osv... | | |

**Handling:** Disse 17 filmpkarene bør flyttes til individuelle mapper med standard navnekonvensjon.

#### B) Harry Potter-serien (8 filmer, opptil 5 versjoner hver) — 🟡 DELVIS GJENNOMFØRT
Versionene er spredt over `/mnt/usb1/Filmer/! - Eventyr/Harry Potter/`, `/mnt/usb1/Filmer/Harry Potter/`, og `/mnt/video/Filmer/Harry Potter/`.

| Film | Antall versjoner | Kvaliteter |
|---|---|---|
| Prisoner of Azkaban | 5 | DvDrip ×3, 720p BrRip, 1080p Rifftrax |
| Deathly Hallows Part 2 | 5 | 1080p BRrip, 720p YIFY, 1080p Bluray, DVDRip, 1080p Rifftrax |
| Half-Blood Prince | 4 | DvDRip ×2, 1080p YIFY, 1080p Rifftrax |
| Chamber of Secrets | 3 | DvdRip ×2, 1080p Rifftrax |
| osv... | | |

**Status (2026-03-21):** Alle 8 Rifftrax 1080p MKV-filer fra den andre disken er flytta til riktig filmmappe under `usb1/Filmer/Harry Potter/[Filmnavn (År)]/` og navngitt etter multi-versjon-konvensjonen (`[Film] - 1080p Rifftrax.mkv`). Jellyfin viser nå **8 oppføringer** (én per film). `! - Eventyr/Harry Potter/` inneholder nå kun metadata-filer (JPG/NFO, ingen video). Gjenstår: full konsolidering av alle gjenværende DVD-rip-versjoner spredt over mapper.

**Handling:** Velg beste versjon per kvalitetsnivå (1080p, 720p, DVD) og organiser med multi-versjon-navngivning.

#### C) Filmer med versjoner på forskjellige disker (usb1 + video)
Disse har typisk en lavkvalitets-versjon på `usb1` og en høykvalitets på `video`:

| Film | usb1 | video |
|---|---|---|
| Oppenheimer | — | 1080p (8.7 GB) + 2160p (17 GB) |
| The Rock | — | 1080p (5.9 GB) + 1080p (7.3 GB) + 2160p (25.7 GB) |
| Crazy, Stupid, Love | DVDRip (0.68 GB) | 1080p (1.73 GB) |
| Bridget Jones's Diary | DVDRip (0.68 GB) | 1080p (4.38 GB) |
| Something Borrowed | 2x DVDRip | 720p (0.69 GB) |
| Cocktail | DVD (3.64 GB) | 1080p (1.64 GB) |
| Headhunters | DVD (3.98 GB) | DVD (5.82 GB) |

**Handling:** Flytt til én felles mappe, behold beste versjon per kvalitetsnivå.

#### D) Samme disk, ulike rips/kvaliteter

| Film | Versjoner |
|---|---|
| The Matrix | DVD (4.27 GB) + UHD 2160p (28.05 GB) |
| Westworld (1973) | 1080p (3.51 GB) + 1080p (1.62 GB) |
| Lucy | 720p (2.26 GB) + 1080p (9.55 GB) |
| Home Alone | DVD (3.75 GB) + BDRip (0.67 GB) + DVDRip (0.69 GB) |
| Night at the Roxbury | DVD (3.64 GB) + avi (0.98 GB) + avi (0.68 GB) |
| Good Will Hunting | 1080p (1.7 GB) + DVDRip (0.68 GB) |
| Four Weddings and a Funeral | DVD (3.72 GB) + 1080p (2.03 GB) |

### 3.2 Filmer — CD-split/multi-part — ✅ GJENNOMFØRT (2026-03-21)

Opprinnelig identifisert som 6 grupper i strategidokumentet, men API-søk avdekket totalt **14 grupper** (57 Jellyfin-oppføringer). Alle er nå stacket korrekt.

| Film | Problem | Løsning | Status |
|---|---|---|---|
| The French Connection | cd1/cd2 i samme mappe | Allerede stacket, ingen endring | ✅ |
| Flawless | cd1/cd2 i samme mappe | Allerede stacket, ingen endring | ✅ |
| Wicker Park | cd1/cd2 i samme mappe | Allerede stacket, ingen endring | ✅ |
| The Rookie | cd1/cd2 i samme mappe | Allerede stacket, ingen endring | ✅ |
| Intolerable Cruelty | `(1of2)`/`(2of2)` | Omdøpt til `cd1`/`cd2` | ✅ |
| Defiance | `.1.avi`/`.2.avi` | Omdøpt til `.cd1.avi`/`.cd2.avi` | ✅ |
| American Reunion | Filer i CD1/CD2-undermapper | Flytta til filmmappe + omdøpt | ✅ |
| Broken Embraces | Filer i cd1/cd2-undermapper | Flytta til filmmappe | ✅ ⚠️ |
| Funny People | Filer i CD1/CD2-undermapper | Flytta til filmmappe | ✅ |
| J. Edgar | Filer i CD1/CD2-undermapper + `a/b`-navn | Flytta + omdøpt til `cd1/cd2` | ✅ |
| Public Enemies | Filer i CD1/CD2-undermapper | Flytta til filmmappe | ✅ |
| Rock Star | Filer i CD1/CD2-undermapper + `CD01/CD02` | Flytta + omdøpt til `cd1/cd2` | ✅ |
| Salmon Fishing in the Yemen | Filer i CD1/CD2-undermapper | Flytta + omdøpt til `.cd1/.cd2` | ✅ |
| The Descendants | Filer i CD1/CD2-undermapper | Flytta til filmmappe | ✅ |
| The Terminator (1984) | Trilogy-mappe med CD1/CD2 + `terma/b` | Flytta + omdøpt til `term.cd1/cd2` | ✅ |
| Terminator 2: Judgment Day | Trilogy-mappe med CD1/CD2 + `term2a/b` | Flytta + omdøpt til `term2.cd1/cd2` | ✅ |
| Terminator 3: Rise of the Machines | Trilogy-mappe med CD1/CD2 + `term3a/b` | Flytta + omdøpt til `term3.cd1/cd2` | ✅ |
| Transformers: Revenge of the Fallen | Filer i CD1/CD2-undermapper | Flytta til filmmappe | ✅ |

> ⚠️ **Broken Embraces**: Stacket korrekt, men Jellyfin klarer ikke identifisere filmen via metadata (viser rå filnavn `bestdivx-brembraces-xvid`). Trenger en `.nfo`-fil med korrekt TMDB-ID.

**Resultat:** Filmtelleren i Jellyfin gikk fra 944 til 889 (−55 oppføringer gjennom stacking).

### 3.3 TV-serier — Duplikater (12 grupper)

| Serie | Stier | Problem |
|---|---|---|
| **Friends** | usb1 + video | Duplikat på tvers av disker |
| **The Big Bang Theory** | usb1 + usb2 | Duplikat på tvers av disker |
| **Keeping Up with the Kardashians** | usb1 + usb2 + video (×3!) | Trippel-duplikat |
| **Modern Family** | usb1 + usb2 | Duplikat |
| **True Detective** | usb1 + usb2 | Duplikat |
| **The Leftovers** | usb1 + usb2 | Duplikat |
| **Westworld** | usb2 + video | Duplikat |
| **Gold Rush** | usb2 + video | Duplikat |
| **MacGyver** | usb1 + video | Duplikat |
| **Yes, Prime Minister** | usb1 + video | Duplikat |
| **The A-Team** | usb1 (2 mapper) | To mapper på samme disk |
| **Black Bird** | video (2 mapper) | To mapper på samme disk |

**Merk:** Jellyfin støtter IKKE multi-versjon for TV-episoder. Duplikate serier bør konsolideres til **én mappe**, og man beholder kun den beste kvaliteten.

---

## 4. Strategi og handlingsplan

### Fase 1: Kartlegging (automatisert)

Bygg et script/verktøy som:
1. **Henter alle filmer og serier** via Jellyfin API (`/Items` med `Fields=Path,MediaSources,ProviderIds`)
2. **Grupperer på TMDB-ID** for å finne duplikater
3. **Klassifiserer hver versjon** med:
   - Oppløsning (2160p/1080p/720p/SD)
   - Kilde (Bluray/WEB-DL/DVDRip/etc.)
   - Codec (x265/x264/XviD)
   - Filstørrelse
   - Container (mkv/mp4/avi)
4. **Identifiserer CD-splits** vs. ekte duplikater
5. **Genererer en flytteplan** (fra → til) som JSON/CSV

### Fase 2: Forberedelse av målmapper

For filmer, opprett riktig mappestruktur:

```
/mnt/video/Filmer/
  The Matrix (1999)/
    The Matrix (1999) - 2160p.mkv
    The Matrix (1999) - 1080p.mkv
    The Matrix (1999) - DVD.mkv
  
  Dr. No (1962)/
    Dr. No (1962) - 1080p.mkv
    Dr. No (1962) - DVD.mkv
  
  Harry Potter and the Prisoner of Azkaban (2004)/
    Harry Potter and the Prisoner of Azkaban (2004) - 1080p.mkv
    Harry Potter and the Prisoner of Azkaban (2004) - 720p.mkv
    Harry Potter and the Prisoner of Azkaban (2004) - DVD.mkv
  
  Oppenheimer (2023)/
    Oppenheimer (2023) - 2160p.mkv
    Oppenheimer (2023) - 1080p.mkv
```

For TV-serier (ingen multi-versjon):
```
/mnt/video/TV-serier/
  Friends/
    Season 1/
      Friends S01E01.mkv
      ...
  Black Bird/
    Season 1/
      Black Bird S01E01.mkv
      ...
```

### Fase 3: Velg kanonisk versjon for TV-serier

For TV-serier med duplikater, sammenlign kvalitet per episode:
- Foretrekk 1080p > 720p > SD
- Foretrekk x265/HEVC > x264 (samme kvalitet, mindre fil)
- Foretrekk nyere rips

### Fase 4: Utfør flytting

Kjør migreringsscriptet med følgende sikkerhetsregler:
- **Dry-run** først: Skriv ut all flyttinger uten å utføre dem
- **Flytt, ikke kopier** der det er på samme disk (sparer tid og plass)
- **Kopier** der det er mellom disker, verifiser, og slett deretter originalen
- **Logg alt**: Skriv til en loggfil med gammal path → ny path
- **Ikke slett noe** inntil alt er verifisert i Jellyfin

### Fase 5: Opprydding i Jellyfin

1. Kjør **Scan All Libraries** i Jellyfin
2. Verifiser at multi-versjon fungerer riktig for noen testfilmer
3. Slett orphaned metadata (Dashboard → Scan All Libraries med "Replace all metadata")
4. Verifiser at CD-split-filmer stacker riktig

---

## 5. Versjons-labels å bruke

Foreslått konvensjon for labels:

| Kildekvalitet | Label | Eksempel |
|---|---|---|
| UHD Blu-ray Remux | `2160p Remux` | `Movie (2020) - 2160p Remux.mkv` |
| UHD Blu-ray encode | `2160p` | `Movie (2020) - 2160p.mkv` |
| 1080p Blu-ray Remux | `1080p Remux` | `Movie (2020) - 1080p Remux.mkv` |
| 1080p Blu-ray encode | `1080p` | `Movie (2020) - 1080p.mkv` |
| 720p encode | `720p` | `Movie (2020) - 720p.mkv` |
| DVD rip | `DVD` | `Movie (2020) - DVD.mkv` |
| WEB-DL | `1080p WEB-DL` | `Movie (2020) - 1080p WEB-DL.mkv` |
| SD/DVDRip | `480p` | `Movie (2020) - 480p.mkv` |

Merk: Labels som ender på `p` eller `i` sorteres automatisk i synkende rekkefølge (2160p → 1080p → 720p → 480p) av Jellyfin.

---

## 6. Prioriterte oppgaver (quick wins)

1. **James Bond** (17 filmer × 2 versjoner) — Stort volum, enkel konsolidering med tydelig 1080p vs DVD
2. **Harry Potter** (8 filmer × 2-5 versjoner) — Rifftrax-filer organisert ✅, gjenstår: full konsolidering av DVD-rip-versjoner spredt over mapper
3. **Oppenheimer, The Rock** — Allerede har 2160p + 1080p, enkelt å sette opp multi-versjon
4. **TV-serier med duplikater** — Fjern dårligste versjon, behold én mappe per serie
5. ~~**CD-splits**~~ ✅ **GJENNOMFØRT** — 18 grupper fikset (2026-03-21), alle stacket korrekt i Jellyfin
6. **Broken Embraces** — Trenger NFO-fil med TMDB-ID (filnavn ikke gjenkjent av Jellyfin)

---

## 7. Estimert besparelse

Mange av duplikatene er lavkvalitets DvDRip/XviD-filer (~0.7 GB) der en bedre 1080p/720p-versjon allerede finnes. Ved å fjerne redundante lavkvalitetsversjoner og beholde kun den beste versjonen per kvalitetsnivå, kan det frigjøres anslagsvis **50-100 GB** diskplass.

Alternativt, ved å beholde **alle versjoner** men organisert med multi-versjon-navngivning, får brukerne valget mellom kvalitetsnivåer uten duplikater i Jellyfin-grensesnittet.

---

## 8. MCP-server — ✅ IMPLEMENTERT (2026-03-21)

MCP-serveren ligger i `src/` og er skrevet i TypeScript. Bygg med `npm run build`.

### Registrerte verktøy

| Verktøy | Beskrivelse |
|---|---|
| `get_stats` | Rask oversikt: filmtelling, manglende metadata, duplikatgrupper |
| `find_missing_metadata` | **Finner filmer/serier uten TMDB/IMDB-ID** — returnerer navn, sti, hvilke ID-er som mangler |
| `analyze_duplicates` | Grupperer på TMDB ID, klassifiserer kvalitet per versjon (2160p/1080p/SD, Bluray/WEB/DVD, codec) |
| `find_cd_splits` | Finner potensielle CD-split-filer som ikke stacker riktig i Jellyfin |
| `generate_move_plan` | Genererer flytte-/rename-plan for å sette opp multi-versjon-navngivning for en film (eller alle) |
| `execute_move` | Utfører én filflytting. Konverterer Linux-stier → Windows UNC automatisk. Har `dry_run: true` som standard |
| `refresh_library` | Trigger Jellyfin-bibliotekets rescan etter filendringer |

### Konfigurasjon

Kopier `.env.example` til `.env` og sett verdier:

```env
JELLYFIN_URL=http://100.114.52.11:8096
JELLYFIN_TOKEN=<api-token>

MOUNT_1_LINUX=/mnt/usb1
MOUNT_1_WINDOWS=\\100.69.132.23\usbshare1-2

MOUNT_2_LINUX=/mnt/video
MOUNT_2_WINDOWS=\\server\video
```

### VS Code Copilot-integrasjon

Legg til i `.vscode/mcp.json` (eller bruker-settings):

```json
{
  "mcpServers": {
    "jellyfin": {
      "command": "node",
      "args": ["c:/repos/jellyfin-mcpserver/dist/index.js"],
      "env": {
        "JELLYFIN_TOKEN": "3957b999d52d477692eb56b6449b5b8b",
        "MOUNT_1_LINUX": "/mnt/usb1",
        "MOUNT_1_WINDOWS": "\\\\100.69.132.23\\usbshare1-2"
      }
    }
  }
}
```

### Typisk arbeidsflyt

```
1. get_stats                          → oversikt over tilstand
2. find_missing_metadata              → finn filer uten TMDB/IMDB
3. analyze_duplicates sort_by=count   → finn filmer med flest duplikater
4. generate_move_plan tmdb_id=<id>    → se hva som må flyttes
5. execute_move dry_run=true          → verifiser én operasjon
6. execute_move dry_run=false         → gjennomfør
7. refresh_library                    → Jellyfin plukker opp endringene
```
