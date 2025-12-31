# Apple Music Integration Plan (Simplified)

This document outlines what you need to gather and the implementation plan for adding Apple Music integration alongside the existing Spotify integration.

**Scope**: Catalog API access with preview URL playback only. No user authentication, no full track playback.

---

## Part 1: What You Need to Gather

### 1.1 Apple Developer Portal Setup

#### Generate a MusicKit Key

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Keys**
3. Click **+** to create a new key
4. Enter a name (e.g., "Song Game MusicKit")
5. Check **MusicKit**
6. Click **Continue** → **Register**
7. **Download the `.p8` private key file immediately** (you can only download it once!)
8. Note down:
   - **Key ID** (10-character string shown on the key details page)

#### Find Your Team ID

1. Go to **Account** → **Membership**
2. Note your **Team ID** (10-character string)

### 1.2 Required Credentials

| Credential          | Description                                         | Where to Find                        |
| ------------------- | --------------------------------------------------- | ------------------------------------ |
| `APPLE_TEAM_ID`     | Your 10-character Apple Team ID                     | Apple Developer Account → Membership |
| `APPLE_KEY_ID`      | The 10-character Key ID for your MusicKit key       | Keys section after creating the key  |
| `APPLE_PRIVATE_KEY` | The contents of the `.p8` file (entire PEM content) | Downloaded when creating the key     |

---

## Part 2: What This Integration Provides

### Capabilities

| Feature                          | Supported | Notes                                    |
| -------------------------------- | --------- | ---------------------------------------- |
| Search Apple Music catalog       | ✅ Yes    | Any song, album, artist, playlist        |
| Import Apple Music playlists     | ✅ Yes    | Curated/editorial playlists              |
| **Import Spotify → Apple Music** | ✅ Yes    | Convert Spotify playlists to Apple Music |
| Play preview clips               | ✅ Yes    | ~30 second previews via HTML5 Audio      |
| Import user's personal library   | ❌ No     | Would require user authentication        |
| Full track playback              | ❌ No     | Would require MusicKit JS + subscription |

### Playback Comparison

| Feature            | Spotify (Current)          | Apple Music (Preview)  |
| ------------------ | -------------------------- | ---------------------- |
| SDK Required       | Spotify Web Playback SDK   | None (HTML5 Audio)     |
| Premium Required   | Yes (for full playback)    | No                     |
| Track Length       | Full song                  | ~30 seconds            |
| User Auth Required | Yes (OAuth)                | No                     |
| Complexity         | High (SDK, tokens, scopes) | Low (just API + audio) |

---

## Part 3: Cross-Provider Import (Spotify → Apple Music)

This is a key feature: import a Spotify playlist but resolve all tracks to Apple Music, using Apple Music as the source of truth.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  Spotify Playlist Import Flow                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User provides Spotify playlist URL                              │
│           ↓                                                         │
│  2. Fetch playlist from Spotify API                                 │
│           ↓                                                         │
│  3. For each track, extract:                                        │
│     • ISRC (International Standard Recording Code) ← best match     │
│     • Track name + Artist name ← fallback                           │
│           ↓                                                         │
│  4. Search Apple Music catalog for each track                       │
│     • First try: ISRC lookup (exact match)                          │
│     • Fallback: Search by "track name + artist name"                │
│           ↓                                                         │
│  5. Store Apple Music data as source of truth:                      │
│     • Apple Music ID                                                │
│     • Title (from Apple Music)                                      │
│     • Artist (from Apple Music)                                     │
│     • Album (from Apple Music)                                      │
│     • Release Date (from Apple Music)                               │
│     • Preview URL                                                   │
│     • Artwork URL                                                   │
│     • Original Spotify ID (for reference)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Matching Strategy

| Method                | Accuracy | Notes                                         |
| --------------------- | -------- | --------------------------------------------- |
| ISRC lookup           | ~95%     | Exact match, same recording across services   |
| Name + Artist         | ~80%     | May match different versions (live, remaster) |
| Name + Artist + Album | ~90%     | Better for avoiding remixes/live versions     |

### Handling Unmatched Tracks

When a Spotify track can't be found on Apple Music:

1. **Option A**: Skip the track, log it for user review
2. **Option B**: Keep track metadata from Spotify, mark as "no preview available"
3. **Option C**: Show user a list of potential matches to choose from (manual resolution)

**Recommended**: Option A with a report of skipped tracks after import.

### ISRC: The Key to Cross-Provider Matching

ISRC (International Standard Recording Code) is a unique identifier for recordings:

- Spotify provides ISRC in track metadata (`external_ids.isrc`)
- Apple Music supports ISRC search: `GET /catalog/{storefront}/songs?filter[isrc]={isrc}`
- Same recording = same ISRC across both platforms

```json
// Spotify track response includes:
{
  "external_ids": {
    "isrc": "USRC11700120"
  }
}

// Apple Music ISRC search:
// GET https://api.music.apple.com/v1/catalog/us/songs?filter[isrc]=USRC11700120
```

---

## Part 4: Implementation Plan

### Phase 1: Environment & Dependency Setup

#### 1.1 Install Dependencies

```bash
# JWT generation for Developer Token (server-side in Convex)
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

#### 1.2 Add Environment Variables

Add to your Convex environment (via Convex dashboard):

```
APPLE_TEAM_ID=<your-team-id>
APPLE_KEY_ID=<your-key-id>
APPLE_PRIVATE_KEY=<your-private-key-contents>
```

Note: The private key should include the full PEM content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.

---

### Phase 2: Backend Implementation (Convex)

#### 2.1 Create Apple Music Module

Create `convex/appleMusic.ts`:

```typescript
// Functions to implement:

// 1. generateDeveloperToken - internal action
//    - Creates JWT signed with private key
//    - Token valid for up to 6 months
//    - Cache and reuse until near expiration

// 2. searchByISRC - action
//    - Lookup song by ISRC code
//    - Returns exact match with preview URL
//    - Primary method for Spotify→Apple Music conversion

// 3. searchCatalog - action
//    - Search Apple Music catalog by text query
//    - Fallback when ISRC lookup fails
//    - Returns results with preview URLs

// 4. getPlaylist - action
//    - Fetch a public Apple Music playlist by ID
//    - Returns tracks with preview URLs

// 5. importAppleMusicPlaylist - mutation
//    - Fetch playlist directly from Apple Music API
//    - Store tracks in database
```

#### 2.2 Create Cross-Provider Import Module

Create `convex/playlistImport.ts`:

```typescript
// Functions to implement:

// 1. importSpotifyPlaylistAsAppleMusic - action
//    - Fetch Spotify playlist (using existing spotify.ts)
//    - For each track:
//      a. Extract ISRC from Spotify track data
//      b. Search Apple Music by ISRC
//      c. If no match, search by name + artist
//      d. If still no match, mark as unmatched
//    - Return: matched tracks + unmatched tracks list

// 2. resolveSpotifyTrackToAppleMusic - internal action
//    - Single track resolution
//    - Try ISRC first, then name+artist fallback
//    - Return Apple Music track or null

// 3. saveImportedPlaylist - mutation
//    - Store the resolved tracks
//    - All metadata from Apple Music (source of truth)
//    - Keep original Spotify ID as reference
```

#### 2.3 Update Schema

Modify `convex/schema.ts`:

```typescript
// songs table updates:
songs: defineTable({
  // ... existing fields ...

  // Source of truth (Apple Music data)
  appleMusicId: v.optional(v.string()),
  title: v.string(), // From Apple Music
  artist: v.string(), // From Apple Music
  album: v.optional(v.string()), // From Apple Music
  releaseDate: v.optional(v.string()), // From Apple Music (YYYY-MM-DD)
  previewUrl: v.optional(v.string()), // Apple Music preview URL
  artworkUrl: v.optional(v.string()), // Apple Music artwork
  isrc: v.optional(v.string()), // For cross-referencing

  // Original source reference
  originalSpotifyId: v.optional(v.string()), // If imported from Spotify
  originalSpotifyUri: v.optional(v.string()),

  // Provider tracking
  resolvedFrom: v.union(
    v.literal('spotify'), // Direct Spotify import
    v.literal('appleMusic'), // Direct Apple Music import
    v.literal('spotifyToApple'), // Spotify playlist → Apple Music resolution
  ),
})

// playlists table updates:
playlists: defineTable({
  // ... existing fields ...

  // Source info
  sourceProvider: v.union(v.literal('spotify'), v.literal('appleMusic')),
  sourcePlaylistId: v.string(),
  sourcePlaylistUrl: v.optional(v.string()),

  // Import stats
  totalTracks: v.number(),
  matchedTracks: v.number(), // Successfully resolved to Apple Music
  unmatchedTracks: v.number(), // Couldn't find on Apple Music
})
```

---

### Phase 3: Frontend Implementation

#### 3.1 Create Preview Audio Player Hook

Create `src/hooks/use-preview-playback.ts`:

```typescript
// Simple HTML5 Audio-based playback hook:
// - play(previewUrl)
// - pause()
// - currentTime, duration
// - isPlaying state
// - No SDK, no auth, just Audio API
```

#### 3.2 Create Unified Player Component

Create `src/components/preview-player.tsx`:

```typescript
// Simple audio player UI:
// - Play/pause button
// - Progress bar (for 30-second preview)
// - Volume control (optional)
// - Works for both Spotify previews and Apple Music previews
```

#### 3.3 Update Playlist Import UI

Modify playlist import to support:

- Input field for playlist URL (auto-detect Spotify or Apple Music)
- Show import progress with track matching status
- Display results: X matched, Y unmatched
- Option to view/export unmatched tracks
- Display imported tracks with Apple Music artwork

---

### Phase 4: Integration with Game Flow

#### 4.1 Track Model Updates

All game tracks use Apple Music as source of truth:

- `title`, `artist`, `album`, `releaseDate` from Apple Music
- `previewUrl` for playback
- `artworkUrl` for display
- Original Spotify reference kept for debugging/reference

#### 4.2 Game Creation

When creating a game:

- User imports playlist (Spotify or Apple Music URL)
- System resolves all tracks to Apple Music
- Game uses Apple Music metadata and preview URLs
- Tracks without Apple Music match are excluded (with notification)

---

## File Changes Summary

### New Files to Create

| File                                | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `convex/appleMusic.ts`              | Apple Music API integration (token, search)   |
| `convex/playlistImport.ts`          | Cross-provider import logic (Spotify → Apple) |
| `src/hooks/use-preview-playback.ts` | HTML5 Audio playback hook                     |
| `src/components/preview-player.tsx` | Simple audio preview player component         |

### Files to Modify

| File                  | Changes                                        |
| --------------------- | ---------------------------------------------- |
| `convex/schema.ts`    | Add Apple Music fields, update songs/playlists |
| `convex/playlists.ts` | Update to use new import flow                  |
| Game-related files    | Use Apple Music data as source of truth        |

### Files to Keep Unchanged

| File                                | Reason                                             |
| ----------------------------------- | -------------------------------------------------- |
| `convex/spotify.ts`                 | Still needed to fetch Spotify playlists for import |
| `convex/spotifyInternal.ts`         | Still needed for Spotify API auth                  |
| `src/hooks/use-spotify-playback.ts` | Keep for optional full Spotify playback            |
| `src/components/spotify-player.tsx` | Keep for optional premium Spotify users            |

---

## Apple Music API Reference

### Developer Token JWT Structure

```javascript
{
  header: {
    alg: "ES256",
    kid: "<your-key-id>"
  },
  payload: {
    iss: "<your-team-id>",
    iat: <current-timestamp>,
    exp: <expiration-timestamp>  // Max 6 months from iat
  }
}
```

### Key API Endpoints

```
Base URL: https://api.music.apple.com/v1

# Search catalog by text
GET /catalog/{storefront}/search?term={query}&types=songs

# Search by ISRC (exact match)
GET /catalog/{storefront}/songs?filter[isrc]={isrc}

# Get playlist
GET /catalog/{storefront}/playlists/{id}

# Get song by ID
GET /catalog/{storefront}/songs/{id}
```

### Example Response (Song with Preview)

```json
{
  "id": "1440783617",
  "type": "songs",
  "attributes": {
    "name": "Song Title",
    "artistName": "Artist Name",
    "albumName": "Album Name",
    "releaseDate": "2017-06-23",
    "durationInMillis": 237000,
    "isrc": "USRC11700120",
    "previews": [
      {
        "url": "https://audio-ssl.itunes.apple.com/...preview.m4a"
      }
    ],
    "artwork": {
      "url": "https://is1-ssl.mzstatic.com/image/.../{w}x{h}bb.jpg",
      "width": 3000,
      "height": 3000
    }
  }
}
```

---

## Estimated Effort

| Phase                           | Estimated Time |
| ------------------------------- | -------------- |
| Phase 1: Setup                  | 30 min         |
| Phase 2: Backend (Apple API)    | 2-3 hours      |
| Phase 2: Backend (Cross-import) | 2-3 hours      |
| Phase 3: Frontend               | 2-3 hours      |
| Phase 4: Integration            | 1-2 hours      |
| **Total**                       | **8-12 hours** |

---

## Next Steps

Once you provide:

1. ✅ `APPLE_TEAM_ID` - Your Team ID
2. ✅ `APPLE_KEY_ID` - Your MusicKit Key ID
3. ✅ `APPLE_PRIVATE_KEY` - Contents of the `.p8` file

I can begin implementation starting with Phase 1.

---

## Questions to Confirm

1. **Storefront**: Which Apple Music storefront should we default to? (e.g., `us`, `gb`, `de`)

2. **Unmatched Track Handling**: What should happen when a Spotify track can't be found on Apple Music?
   - A: Skip it silently
   - B: Skip it but show a report after import
   - C: Allow manual resolution (show search results to pick from)

3. **Existing Playlists**: Should we migrate existing Spotify playlists to this new format, or only apply to new imports?
