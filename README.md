# OBS-web

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-13-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

#### The easiest way to control [OBS](https://obsproject.com/) remotely

### **URL: http://obs-web.niek.tv/**

###### Download latest build [here](https://github.com/Niek/obs-web/archive/gh-pages.zip)

---

#### Screenshot:

![Screenshot of OBS-web](.github/screenshot.png)

#### Features:

- No installation or extra software needed, works in any modern browser (desktop + mobile)
- Support for local and remote control through [WSS tunnels](https://github.com/Palakis/obs-websocket/blob/4.x-current/SSL-TUNNELLING.md)
- Easily switch scenes and start/stop streaming and recording
- Support for Studio Mode (preview and program scenes)
- Live view of output, updating 1 fps
- Fullscreen button and wakelock support (keeps screen on)
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
npm i
npm run dev # or: npm run build
```

#### Docker:

```bash
docker run --rm -p5000:5000 ghcr.io/niek/obs-web
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/verstaerker-583"><img src="https://avatars2.githubusercontent.com/u/40574338?v=4?s=100" width="100px;" alt=""/><br /><sub><b>verstaerker-583</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=verstaerker-583" title="Code">💻</a></td>
    <td align="center"><a href="http://crazy4groovy.blogspot.ca"><img src="https://avatars0.githubusercontent.com/u/1110812?v=4?s=100" width="100px;" alt=""/><br /><sub><b>crazy4groovy</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Acrazy4groovy" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/isctylr"><img src="https://avatars0.githubusercontent.com/u/24595776?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Isaac Taylor</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=isctylr" title="Code">💻</a> <a href="#ideas-isctylr" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/darthclide"><img src="https://avatars1.githubusercontent.com/u/46735828?v=4?s=100" width="100px;" alt=""/><br /><sub><b>darthclide</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Adarthclide" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://blog.rodrigograca.com/"><img src="https://avatars2.githubusercontent.com/u/1134310?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rodrigo Graça</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=rodrigograca31" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/feitosa-daniel"><img src="https://avatars2.githubusercontent.com/u/1847734?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Daniel Feitosa</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=feitosa-daniel" title="Code">💻</a></td>
    <td align="center"><a href="http://linkedin.com/in/arun-woosaree"><img src="https://avatars1.githubusercontent.com/u/8227297?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Arun Woosaree</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=Arunscape" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://avil13.com"><img src="https://avatars3.githubusercontent.com/u/1606172?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Aleksey Pivkin</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=avil13" title="Code">💻</a> <a href="#ideas-avil13" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="http://www.nathaneaston.com/"><img src="https://avatars.githubusercontent.com/u/10368650?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Nathan Easton</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=ndragon798" title="Code">💻</a></td>
    <td align="center"><a href="https://www.shortcord.com"><img src="https://avatars.githubusercontent.com/u/3823744?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tristan Smith</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3Ateh-random-name" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://filiphanes.sk"><img src="https://avatars.githubusercontent.com/u/33264909?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Filip Hanes</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=filiphanes" title="Code">💻</a> <a href="#ideas-filiphanes" title="Ideas, Planning, & Feedback">🤔</a> <a href="#design-filiphanes" title="Design">🎨</a> <a href="https://github.com/Niek/obs-web/issues?q=author%3Afiliphanes" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/TotalInternalReflection"><img src="https://avatars.githubusercontent.com/u/49660235?v=4?s=100" width="100px;" alt=""/><br /><sub><b>TotalInternalReflection</b></sub></a><br /><a href="https://github.com/Niek/obs-web/issues?q=author%3ATotalInternalReflection" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://www.nossa.me/"><img src="https://avatars.githubusercontent.com/u/17525117?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alessio Nossa</b></sub></a><br /><a href="#ideas-alessionossa" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
