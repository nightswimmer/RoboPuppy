// Client for the SolidCraft desktop app's control channel (docs/control-protocol.md in the SolidCraft
// repository): JSON lines over TCP on 127.0.0.1, authenticated with the token the app writes for this
// launch. Lets the build run through the open app when the CLI cannot be started.
// Turn the channel on in the app: Preferences > Assistant > Agents through MCP > "Let AI agents connect".
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

function controlDir() {
  if (process.env.SOLIDCRAFT_CONTROL_DIR) return process.env.SOLIDCRAFT_CONTROL_DIR;
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(local, "SolidCraft", "control");
}

function findPort() {
  if (process.env.SOLIDCRAFT_CONTROL_PORT) return Number(process.env.SOLIDCRAFT_CONTROL_PORT);
  const f = path.join(controlDir(), "current.port");
  if (!fs.existsSync(f)) throw new Error(`no running SolidCraft app found (${f} is missing); open the app and turn on "Let AI agents connect"`);
  return Number(fs.readFileSync(f, "utf8").trim());
}

function readToken(port) {
  if (process.env.SOLIDCRAFT_CONTROL_TOKEN) return process.env.SOLIDCRAFT_CONTROL_TOKEN;
  return fs.readFileSync(path.join(controlDir(), `${port}.token`), "utf8").trim();
}

class Control {
  // One connection, one request at a time.
  static async open() {
    const port = findPort();
    const c = new Control(port, readToken(port));
    await new Promise((resolve, reject) => {
      c.sock = net.createConnection({ host: "127.0.0.1", port }, resolve);
      c.sock.once("error", reject);
    });
    c.sock.setEncoding("utf8");
    c.sock.on("data", (d) => c.onData(d));
    c.sock.on("error", (e) => c.fail(e));
    c.sock.on("close", () => c.fail(new Error("control channel closed")));
    return c;
  }
  constructor(port, token) { this.port = port; this.token = token; this.id = 0; this.buf = ""; this.waiting = null; }
  onData(d) {
    this.buf += d;
    let i;
    while ((i = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, i).trim();
      this.buf = this.buf.slice(i + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.event) continue;                     // subscription events are not used here
      if (this.waiting && msg.id === this.waiting.id) { const w = this.waiting; this.waiting = null; w.resolve(msg); }
    }
  }
  fail(e) { if (this.waiting) { const w = this.waiting; this.waiting = null; w.reject(e); } }
  // Raw request: resolves with the whole reply line ({id, ok, result|error}).
  request(method, params = {}) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (id === 1) msg.token = this.token;
    return new Promise((resolve, reject) => {
      this.waiting = { id, resolve, reject };
      this.sock.write(JSON.stringify(msg) + "\n");
    });
  }
  // Request that throws on {ok: false}.
  async call(method, params = {}) {
    const r = await this.request(method, params);
    if (!r.ok) throw new Error(`${method}: ${r.error}`);
    return r.result;
  }
  execute(command, params = {}) { return this.call("engine.execute", { command, params }); }
  close() { this.sock.removeAllListeners("close"); this.sock.end(); }
}

module.exports = { Control, controlDir, findPort };
