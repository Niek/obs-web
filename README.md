# OBS-web
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
#### The easiest way to control [OBS](https://obsproject.com/) remotely

### **URL: http://obs-web.niek.tv/**

---
#### Screenshot:
![Screenshot of OBS-web](.github/screenshot.png)

#### Features:
- No installation needed, works in any modern browser (desktop + mobile)
- Support for remote control through [WSS tunnels](https://github.com/Palakis/obs-websocket#connecting-over-a-tlssecure-connection-or-remotely)
- Easily switch scenes and start/stop streaming
- Preview of output, updating continuously
- Fullscreen button and wakelock support
- Easy bookmarking/deeplink by specifying host in URL
- Hide scenes that have ``(hidden)`` in their name
---

#### Requirements:
- [OBS](https://obsproject.com/)
- [OBS-websocket](https://github.com/Palakis/obs-websocket/releases) plugin
- A tunnel service if you want to control remotely, [see these instructions](https://github.com/Palakis/obs-websocket#connecting-over-a-tlssecure-connection-or-remotely)

---

#### Build instructions:
```bash
npm i
npm run dev # or: npm run build
```
## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/verstaerker-583"><img src="https://avatars2.githubusercontent.com/u/40574338?v=4" width="100px;" alt=""/><br /><sub><b>verstaerker-583</b></sub></a><br /><a href="https://github.com/Niek/obs-web/commits?author=verstaerker-583" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!