# OBS-web

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-18-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## Fork note: audio meter additions

This repository is a community fork of [Niek/obs-web](https://github.com/Niek/obs-web), the browser-based OBS remote control project.

This fork adds OBS websocket-driven audio meters for active OBS input volume levels, plus a collapsible Local Browser Mic Test diagnostics section. It also preserves fixed 960x540 program/preview screenshot sizing and makes additional Vite dev/preview allowed hosts configurable through `VITE_ALLOWED_HOSTS`.

This is not the official OBS-web project. It is offered as an experimental enhancement in case the audio-meter workflow is useful to others.

### Added in this fork

- OBS websocket-driven audio meters for active OBS input volume levels
- Collapsible Local Browser Mic Test diagnostics section
- Shared fixed 960x540 screenshot sizing for program/preview images
- Configurable extra Vite dev/preview allowed hosts via `VITE_ALLOWED_HOSTS`

### Development note

These changes were built with AI assistance and reviewed/tested locally with:

- `npm run lint`
- `npm run build`

The original GPL-3.0 license, project attribution, and contributor information are preserved below.

---

#### The easiest way to control [OBS](https://obsproject.com/) remotely

### **URL: http://obs-web.niek.tv/**

###### Download latest build [here](https://github.com/Niek/obs-web/archive/gh-pages.zip)

---

#### Screenshot:

![Screenshot of OBS-web](.github/screenshot.png)

#### Features:

- No installation or extra software is needed, works in any modern browser (desktop + mobile)
- Support for local network and internet control through [WSS tunnels](https://github.com/obsproject/obs-websocket/blob/4.x-compat/SSL-TUNNELLING.md)
- Easily switch scenes and start/stop streaming and recording
- Support for Studio Mode (preview and program scenes)
- Support for Virtual Camera
- Live view of preview & output, updating 1 fps
- Fullscreen button and wakelock support (keeps the screen on)
- Replay Buffer button
- Easy bookmarking/deeplink by specifying host in URL
- Profile switching support
- Scene Collections switching support
- Custom transition support
- Extra features:
  - Hide scenes that have `(hidden)` in their name
  - Switch sources in scenes with `(switch)` in their name visually by thumbnails


---

#### Requirements:

- [OBS](https://obsproject.com/) v28 or higher - this includes the latest version of the OBS-websocket plugin
  - OBS v27 is also supported, by manually installing the [OBS-websocket v5](https://github.com/obsproject/obs-websocket/releases/latest) plugin
  - For older OBS versions, use the [OBS-websocket v4](https://github.com/obsproject/obs-websocket/releases/tag/4.9.1-compat) plugin and [OBS-web v4](http://obs-web.niek.tv/v4/) (no longer maintained)
- Enabling the OBS-websocket server in OBS under `Tools -> obs-websocket Settings -> Enable WebSocket Server`
- Optionally: a tunnel service if you want to control OBS outside your local network, [see these instructions](https://github.com/obsproject/obs-websocket/blob/4.x-compat/SSL-TUNNELLING.md)

---

#### Build instructions:

```bash
npm ci
npm run dev # or: npm run build
```

#### Docker:

```bash
docker run --rm -p8080:8080 ghcr.io/niek/obs-web
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/verstaerker-583"><img src="https://avatars2.githubusercontent.com/u/40574338?v=4?s=100" width="100px;" alt="verstaerker-583"/><br /><sub><b>verstaerker-583</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=verstaerker-583" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://crazy4groovy.blogspot.ca"><img src="https://avatars0.githubusercontent.com/u/1110812?v=4?s=100" width="100px;" alt="crazy4groovy"/><br /><sub><b>crazy4groovy</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Acrazy4groovy" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/isctylr"><img src="https://avatars0.githubusercontent.com/u/24595776?v=4?s=100" width="100px;" alt="Isaac Taylor"/><br /><sub><b>Isaac Taylor</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=isctylr" title="Code">💻</a> <a href="#ideas-isctylr" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/darthclide"><img src="https://avatars1.githubusercontent.com/u/46735828?v=4?s=100" width="100px;" alt="darthclide"/><br /><sub><b>darthclide</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Adarthclide" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.rodrigograca.com/"><img src="https://avatars2.githubusercontent.com/u/1134310?v=4?s=100" width="100px;" alt="Rodrigo Graça"/><br /><sub><b>Rodrigo Graça</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=rodrigograca31" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/feitosa-daniel"><img src="https://avatars2.githubusercontent.com/u/1847734?v=4?s=100" width="100px;" alt="Daniel Feitosa"/><br /><sub><b>Daniel Feitosa</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=feitosa-daniel" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://linkedin.com/in/arun-woosaree"><img src="https://avatars1.githubusercontent.com/u/8227297?v=4?s=100" width="100px;" alt="Arun Woosaree"/><br /><sub><b>Arun Woosaree</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=Arunscape" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://avil13.com"><img src="https://avatars3.githubusercontent.com/u/1606172?v=4?s=100" width="100px;" alt="Aleksey Pivkin"/><br /><sub><b>Aleksey Pivkin</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=avil13" title="Code">💻</a> <a href="#ideas-avil13" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.nathaneaston.com/"><img src="https://avatars.githubusercontent.com/u/10368650?v=4?s=100" width="100px;" alt="Nathan Easton"/><br /><sub><b>Nathan Easton</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=ndragon798" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.shortcord.com"><img src="https://avatars.githubusercontent.com/u/3823744?v=4?s=100" width="100px;" alt="Tristan Smith"/><br /><sub><b>Tristan Smith</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Ateh-random-name" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://filiphanes.sk"><img src="https://avatars.githubusercontent.com/u/33264909?v=4?s=100" width="100px;" alt="Filip Hanes"/><br /><sub><b>Filip Hanes</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=filiphanes" title="Code">💻</a> <a href="#ideas-filiphanes" title="Ideas, Planning, & Feedback">🤔</a> <a href="#design-filiphanes" title="Design">🎨</a> <a href="https://github.com/Niek/obs-web/issues?q=author%3Afiliphanes" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TotalInternalReflection"><img src="https://avatars.githubusercontent.com/u/49660235?v=4?s=100" width="100px;" alt="TotalInternalReflection"/><br /><sub><b>TotalInternalReflection</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3ATotalInternalReflection" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.nossa.me/"><img src="https://avatars.githubusercontent.com/u/17525117?v=4?s=100" width="100px;" alt="Alessio Nossa"/><br /><sub><b>Alessio Nossa</b></sub></a><br /><a href="#ideas-alessionossa" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tt2468.net"><img src="https://avatars.githubusercontent.com/u/28720189?v=4?s=100" width="100px;" alt="tt2468"/><br /><sub><b>tt2468</b></sub></a><br /><a href="#ideas-tt2468" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/donahuetech"><img src="https://avatars.githubusercontent.com/u/28513975?v=4?s=100" width="100px;" alt="donahuetech"/><br /><sub><b>donahuetech</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=donahuetech" title="Code">💻</a> <a href="#ideas-donahuetech" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AshwinSatyawan"><img src="https://avatars.githubusercontent.com/u/40487239?v=4?s=100" width="100px;" alt="AshwinSatyawan"/><br /><sub><b>AshwinSatyawan</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=AshwinSatyawan" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ewized"><img src="https://avatars.githubusercontent.com/u/1458852?v=4?s=100" width="100px;" alt="ewized"/><br /><sub><b>ewized</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=ewized" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/bzip22"><img src="https://avatars.githubusercontent.com/u/21367547?v=4?s=100" width="100px;" alt="bzip22"/><br /><sub><b>bzip22</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=bzip22" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
