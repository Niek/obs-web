# OBS-web
#### The easiest way to control OBS remotely

### **URL: http://obs-web.niek.tv/**

---

#### Features:
- No installation needed, works in any browser (desktop + mobile)
- Easily switch scenes and start/stop streaming
- Hide scenes that have ``(hidden)`` in their name
- Preview of output, updating continuously
- Support for remote control through [WSS tunnels](https://github.com/Palakis/obs-websocket#connecting-over-a-tlssecure-connection-or-remotely)

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