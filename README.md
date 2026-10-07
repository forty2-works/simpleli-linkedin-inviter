# SimpleLi LinkedIn Inviter (Event + Page)

Two Chrome extensions that invite your LinkedIn connections in bulk:

| Extension | What it does |
|---|---|
| **LinkedIn Event Inviter** (`linkedin-event-inviter/`) | Invites a list of your connections to a LinkedIn event. |
| **LinkedIn Page Inviter** (`linkedin-page-inviter/`) | Invites your connections to follow a LinkedIn company page you administer. |

> **Discontinued, now open source.** SimpleLi has been discontinued. The extensions are now free, open source (MIT) and have **no invitation limit**. We do not actively maintain them. If LinkedIn changes its pages, they may stop working. Need it kept running for your team? [Contact us at forty2.works/simpleli](https://forty2.works/simpleli/#keep).

## Install from GitHub (no build needed)

1. Download the ZIP for the extension you want from the [latest release](https://github.com/forty2-works/simpleli-linkedin-inviter/releases/latest):
   - `linkedin-event-inviter-v….zip`
   - `linkedin-page-inviter-v….zip`
2. Unzip it into a folder you will keep (Chrome loads the extension from that folder, so do not delete it).
3. Open `chrome://extensions` in Chrome (or Edge: `edge://extensions`, Brave: `brave://extensions`).
4. Switch on **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
6. Pin the extension via the puzzle icon in the toolbar.

**Already have an older version installed?** Remove it first, so you don't end up with two copies.

**Updating:** download the new ZIP, replace the folder contents, then click the reload icon on the extension card in `chrome://extensions`.

## Usage

**Event Inviter:** open your event on `linkedin.com/events/…`, click the extension icon, paste the names of the connections you want to invite (one per line), and start. Tip: export your connections via LinkedIn's [download your data](https://www.linkedin.com/mypreferences/d/download-my-data).

**Page Inviter:** open your company page's admin view on LinkedIn, click the extension icon, paste the names, and start.

Both extensions work in English and German.

## Build from source

Requires Node.js 18+.

```bash
cd linkedin-event-inviter   # or linkedin-page-inviter
npm ci
npm run build               # output in dist/ → "Load unpacked" this folder
npm run zip                 # optional: package dist/ as a ZIP
```

`npm start` builds in watch mode for development.

## Privacy

The extensions run entirely in your browser. Names you enter stay in local extension storage. Nothing is sent to us or anyone else: no tracking, no analytics.

## License

[MIT](LICENSE) © soft.fact GmbH. Made by the team behind [forty²](https://forty2.works/).
