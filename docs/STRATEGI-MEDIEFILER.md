# Jellyfin: Organisering av mediefiler — regler og best practice

## 1. Mappestruktur

### Filmer
En mappe per film, navngitt med tittel og årstall:
```
/Filmer/
  The Matrix (1999)/
    The Matrix (1999).mkv
  Oppenheimer (2023)/
    Oppenheimer (2023).mkv
```

### TV-serier
En mappe per serie, undermapper per sesong, episoder navngitt med SxxExx:
```
/TV-serier/
  Breaking Bad/
    Season 1/
      Breaking Bad S01E01.mkv
      Breaking Bad S01E02.mkv
    Season 2/
      ...
```

### Metadata-filer (.nfo)
Jellyfin leser `.nfo`-filer plassert ved siden av videofilen:
- **Film:** `movie.nfo` i filmens mappe (eller samme navn som videofilen)
- **TV-serie:** `tvshow.nfo` i seriens rotmappe

Minimalt NFO-format:
```xml
<!-- Film -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>The Matrix</title>
  <year>1999</year>
  <uniqueid type="imdb" default="true">tt0133093</uniqueid>
  <uniqueid type="tmdb">603</uniqueid>
</movie>

<!-- TV-serie -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<tvshow>
  <title>Breaking Bad</title>
  <year>2008</year>
  <uniqueid type="imdb" default="true">tt0903747</uniqueid>
  <uniqueid type="tmdb">1396</uniqueid>
</tvshow>
```

NFO-filer brukes for å "låse" metadata til korrekt film/serie, spesielt nyttig når filnavnet er uklart (f.eks. scene-navn, raw DVD-rips med `title00.mkv`, feilstavede mappenavn).

---

## 2. Multi-versjon (flere kvaliteter av samme film)

Jellyfin støtter **flere versjoner av samme film** i én mappe. Når brukeren spiller av filmen, kan de velge mellom versjonene.

### Navnekonvensjon
Filene må ligge i **samme mappe**, ha **identisk basenavn**, og en versions-label etter ` - `:

```
/Filmer/The Matrix (1999)/
  The Matrix (1999) - 2160p.mkv
  The Matrix (1999) - 1080p.mkv
  The Matrix (1999) - DVD.mkv
```

### Regler
- Basenavnet **MÅ** være identisk (tittel + årstall)
- Versjons-label skilles med ` - ` (mellomrom, bindestrek, mellomrom)
- Labels som slutter på `p` eller `i` sorteres automatisk høyest-til-lavest (2160p → 1080p → 720p → 480p)
- Andre labels (`DVD`, `Remux`, `Rifftrax`) sorteres alfabetisk
- Brackets er valgfritt: `Film (2020) - [1080p].mkv` fungerer også

### Anbefalte versions-labels

| Kilde | Label | Eksempel |
|---|---|---|
| UHD Blu-ray Remux | `2160p Remux` | `Film (2020) - 2160p Remux.mkv` |
| UHD Blu-ray encode | `2160p` | `Film (2020) - 2160p.mkv` |
| 1080p Blu-ray Remux | `1080p Remux` | `Film (2020) - 1080p Remux.mkv` |
| 1080p Blu-ray encode | `1080p` | `Film (2020) - 1080p.mkv` |
| 1080p WEB-DL | `1080p WEB-DL` | `Film (2020) - 1080p WEB-DL.mkv` |
| 720p encode | `720p` | `Film (2020) - 720p.mkv` |
| DVD rip | `DVD` | `Film (2020) - DVD.mkv` |
| Spesialversjon | `Directors Cut` | `Film (2020) - Directors Cut.mkv` |

### Multi-versjon gjelder IKKE for TV-serier
Jellyfin støtter ikke multi-versjon for enkelt-episoder. For TV-serier: behold kun én versjon per episode.

---

## 3. CD-split / multi-part filmer

Eldre rips delt over CD1/CD2 kan stackes automatisk av Jellyfin dersom filnavnene følger støttet konvensjon:

### Støttede suffikser
| Format | Eksempel |
|---|---|
| `- CD1` / `- CD2` | `Film (1999) - CD1.avi` |
| `- Part1` / `- Part2` | `Film (1999) - Part1.mkv` |
| `- Disc1` / `- Disc2` | `Film (1999) - Disc1.mkv` |
| `.cd1` / `.cd2` | `film.cd1.avi` |

Scene-navn som `release-filmcd1.avi` eller `film.a.avi` **stacker ikke** — disse må renames.

### Fremgangsmåte
1. Identifiser CD-split-filer (to filer i samme mappe med lignende navn uten Jellyfin-støttet suffix)
2. Rename begge filer til `Tittel (År) - CD1.ext` og `Tittel (År) - CD2.ext`
3. Rename tilhørende subtitle-filer (.srt/.idx/.sub) tilsvarende
4. Trigger library refresh i Jellyfin

---

## 4. Manglende metadata

### Årsaker til at Jellyfin ikke gjenkjenner en fil
- Filnavn/mappenavn inneholder scene-gruppenavn (f.eks. `release-filmname.avi`)
- Mappen heter `title00.mkv` (raw DVD-rip uten kontekst)
- Skrivefeil i tittel eller årstall
- Norske/svenske titler som TMDB ikke matcher direkte

### Løsninger (i prioritert rekkefølge)
1. **Rename filen/mappen** til `Tittel (År).ext` — Jellyfin gjenkjenner automatisk
2. **Lag en `.nfo`-fil** med korrekt IMDB/TMDB-ID — krever ikke rename
3. **Manuell matching** i Jellyfin-webgrensesnittet (rediger metadata → søk)

### IMDB/TMDB-ID-er
- IMDB: `tt` + tall, f.eks. `tt0133093` — finnes i URL på imdb.com/title/tt0133093/
- TMDB: heltall, f.eks. `603` — finnes i URL på themoviedb.org/movie/603

---

## 5. Duplikater

### Filmer
Jellyfin detekterer duplikater basert på TMDB-ID. To filmer med samme TMDB-ID i separate mapper vises som to oppføringer.

**Konsolider** ved å:
1. Flytte begge filer til én felles mappe
2. Rename til multi-versjon-konvensjon (`Film (År) - 1080p.mkv`, `Film (År) - DVD.mkv`)
3. Trigger library refresh

### TV-serier
Duplikate serier (samme serie i to mapper) må konsolideres til én mappe. Behold beste kvalitet per episode.

---

## 6. Sti-mapping (Linux ↔ Windows)

Jellyfin kjører ofte på Linux/NAS og rapporterer stier i Linux-format (`/mnt/disk/Filmer/`). Hvis filene aksesseres fra Windows for redigering (flytte/rename), må stiene mappas til UNC-format:

| Linux-sti | Windows UNC |
|---|---|
| `/mnt/disk1/` | `\\server\share1\` |
| `/mnt/disk2/` | `\\server\share2\` |

Mapping konfigureres via `MOUNT_*`-miljøvariabler i denne MCP-serverens `.env`-fil.

---

## 7. Arbeidsflyt for opprydding

```
1. get_stats                          → oversikt: antall filmer/serier, manglende metadata, duplikater
2. find_missing_metadata              → finn filer uten TMDB/IMDB-ID
3. analyze_duplicates                 → grupper duplikater, se kvalitet per versjon
4. find_cd_splits                     → finn filer som ikke stacker korrekt
5. generate_move_plan tmdb_id=<id>    → se foreslått flytte-/rename-operasjon
6. execute_move dry_run=true          → verifiser operasjonen uten å utføre
7. execute_move dry_run=false         → gjennomfør
8. refresh_library                    → Jellyfin plukker opp endringene
```

### Sikkerhetsregler
- **Alltid dry_run=true først** — verifiser hva som vil skje
- **Logg alle operasjoner** — behold en operasjonslogg
- **Flytt, ikke kopier** på samme disk — kopier på tvers av disker, verifiser, slett original
- **Ikke slett noe** inntil Jellyfin viser korrekt resultat

---

## 8. MCP-serverens verktøy

| Verktøy | Beskrivelse |
|---|---|
| `get_stats` | Rask oversikt: filmtelling, manglende metadata, duplikatgrupper |
| `find_missing_metadata` | Filmer/serier uten TMDB/IMDB-ID, gruppert etter type |
| `analyze_duplicates` | Grupperer på TMDB-ID, klassifiserer kvalitet (2160p/1080p/SD, kilde, codec) |
| `find_cd_splits` | Finner potensielle CD-split-filer som ikke stacker riktig |
| `generate_move_plan` | Genererer flytte-/rename-plan for multi-versjon-oppsett |
| `execute_move` | Utfører filflytting med Linux→Windows UNC-konvertering. `dry_run: true` som standard |
| `refresh_library` | Trigger Jellyfinets biblioteksrescan etter filendringer |

### Konfigurasjon (.env)
```env
JELLYFIN_URL=http://<server>:<port>
JELLYFIN_TOKEN=<api-token>

# Sti-mapping: Linux-sti (fra Jellyfin API) → Windows UNC (for filoperasjoner)
MOUNT_1_LINUX=/mnt/disk1
MOUNT_1_WINDOWS=\\server\share1

MOUNT_2_LINUX=/mnt/disk2
MOUNT_2_WINDOWS=\\server\share2
```
