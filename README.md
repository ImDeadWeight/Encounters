<img src="app-icon.svg" alt="Encounters icon" width="96">

# Encounters

A DM companion for building encounters ahead of time and running them with a live initiative tracker.
Built with Tauri 2 + React + TypeScript; one codebase targets Windows and Android.

## Develop

```sh
npm install
npm run dev        # browser-only UI at http://localhost:1420 (data in localStorage)
npm test           # domain logic tests (combat engine, encounter building)
npm run tauri dev  # desktop app (needs the Rust toolchain, see below)
```

### One-time setup for the desktop build (Windows)

1. Microsoft C++ Build Tools ("Desktop development with C++") — `winget install Microsoft.VisualStudio.2022.BuildTools`
2. Rust — `winget install Rustlang.Rustup`, then `rustup default stable`
3. WebView2 is preinstalled on Windows 11.

`npm run tauri build` produces the installer under `src-tauri/target/release/bundle/`.

### Android

One-time setup: Android Studio (its bundled Java), the NDK (`sdkmanager --install ndk/29.0.14206865`), the Rust targets
(`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`), and the
environment variables `JAVA_HOME` (Android Studio's `jbr` folder), `ANDROID_HOME` (the SDK) and `NDK_HOME` (the NDK).

```sh
npm run tauri android init     # once; generates src-tauri/gen/android (not committed)
npm run tauri android build -- --debug --apk --target aarch64 --target x86_64   # phones + emulator
```

The APK lands in `src-tauri/gen/android/app/build/outputs/apk/universal/debug/`. On a phone the screens show one panel
at a time; data comes over with Import (a Backup from the desktop app) through the system file picker, and Backup saves
back out the same way. To link with Lorekeeper on Android, choose the shared folder (e.g. `Documents/CampaignLink`)
in a campaign's edit dialog, and choose the same folder in Lorekeeper; links between the apps work on Android too.

## Data

Saved as JSON under `%APPDATA%\com.encounters.app\data\`:
`library.json` (campaigns, areas, encounters + combat state), `characters.json` (templates, tags),
`conditions.json` (custom conditions). An unreadable file is backed up as `*.corrupt-<time>.json`
before a fresh one is started.

Encounters also publishes its campaign list to `%APPDATA%\CampaignLink\encounters.json`, the folder it shares with
Lorekeeper (format: the [campaign-link](https://github.com/ImDeadWeight/campaign-link) package). On Android the shared
folder is one the user picks (the package's link-folder plugin reads and writes it); in a plain browser linking isn't
available.

## Working with Lorekeeper

- **Link a campaign** to a Lorekeeper notebook in the campaign's edit dialog (Lorekeeper can start the link too).
- **Name suggestions**: while naming a character, matching Character pages from linked notebooks appear under the
  Name field. Picking one fills in the name and PC/NPC and remembers the page; the editor shows it, with
  Open in Lorekeeper. The combatant panel has the same button.
- **Links**: `encounters://encounter/<id>` and `encounters://character/<id>` open in Encounters (the running window,
  if there is one). The scheme is registered each time the app starts, so development builds work too.

## Layout

- `src/domain` — pure logic, no React: formats (5e rules/stat block), combat engine, library tree.
- `src/state` — zustand stores, undo/redo history, persistence.
- `src/storage` — Tauri file store / browser fallback.
- `src/ui` — components, grouped by screen area.
- `src-tauri` — the native shell.

Adding a game format = a `GameFormat` in `src/domain/formats/<id>` plus a View/Editor pair in `src/ui/formats/<id>`,
registered in `registry.ts`, `formatUi.ts`, the `FormatId` union and the `StatBlock` union. The format supplies its
combat rules as data: initiative die and tiebreak, dying rules (`deathSaves`, `dyingValue`, `negativeHp`,
`deadAtZero`), and whether conditions carry a value. Every encounter uses one format, and only that format's
characters can join it.

## Legal

Encounters is compatible with fifth edition rules. It is not affiliated with, endorsed, sponsored, or approved by
Wizards of the Coast LLC. Dungeons & Dragons and D&D are trademarks of Wizards of the Coast LLC.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and
available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative
Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available
at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International
License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Pathfinder is a registered trademark of Paizo Inc. Encounters is not published, endorsed, or specifically approved by
Paizo Inc. The PF2e format paraphrases rules from Pathfinder Player Core © 2023 Paizo Inc., used under the ORC License.

ORC Notice: This product is licensed under the ORC License held in the Library of Congress at TX 9-307-067 and
available online at various locations including www.paizo.com/orclicense, www.azoralaw.com/orclicense,
www.gencon.com/orclicense and others. All warranties are disclaimed as set forth therein.

Starfinder is a registered trademark of Paizo Inc. The SF2e format reuses the PF2e rules text above, used under the
ORC License; Encounters is not published, endorsed, or specifically approved by Paizo Inc.

The PF1e, 3.5e and B/X formats describe game mechanics in original wording and include no Open Game Content, so the
Open Game License is not used. The format names only describe which rules each one follows; Encounters is not
affiliated with or endorsed by the owners of those games.
