// Ejecutor de funciones backend de Base44 (Deno). Un proceso por app, con los
// secretos de esa app como variables de entorno. Carga base44/functions/<nombre>/entry.ts
// e intercepta Deno.serve() para obtener el handler de cada función.
const PORT = Number(Deno.env.get("RUNNER_PORT") || "0");
const DIR = (Deno.env.get("FUNCTIONS_DIR") || "").replace(/\/$/, "");

type Handler = (req: Request, info?: unknown) => Response | Promise<Response>;
const handlers = new Map<string, Handler>();
let capture: ((h: Handler) => void) | null = null;

const realServe = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (a: any, b?: any) => {
  const h: Handler = typeof a === "function" ? a : typeof b === "function" ? b : a?.handler;
  if (capture && h) capture(h);
  return {
    finished: Promise.resolve(),
    shutdown: async () => {},
    ref() {},
    unref() {},
    addr: { hostname: "127.0.0.1", port: 0, transport: "tcp" },
  };
};

let lock: Promise<unknown> = Promise.resolve();

async function exists(path: string) {
  try {
    return (await Deno.stat(path)).isFile;
  } catch {
    return false;
  }
}

async function load(name: string): Promise<Handler | null> {
  const cached = handlers.get(name);
  if (cached) return cached;
  const run = lock.then(async () => {
    if (handlers.has(name)) return handlers.get(name)!;
    let file = "";
    for (const f of ["entry.ts", "entry.js", "index.ts", "index.js"]) {
      if (await exists(`${DIR}/${name}/${f}`)) {
        file = `${DIR}/${name}/${f}`;
        break;
      }
    }
    if (!file) return null;
    const got = new Promise<Handler>((resolve) => (capture = resolve));
    try {
      await import(`file://${file}`);
      const h = await Promise.race([
        got,
        new Promise<null>((r) => setTimeout(() => r(null), 15000)),
      ]);
      if (h) handlers.set(name, h);
      return h;
    } finally {
      capture = null;
    }
  });
  lock = run.catch(() => null);
  return await run;
}

realServe({ port: PORT, hostname: "127.0.0.1", onListen: () => console.log(`runner listo en ${PORT}`) }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/__health") return new Response("ok");
  if (!url.pathname.startsWith("/__fn/")) return new Response("not found", { status: 404 });
  const name = decodeURIComponent(url.pathname.slice(6));
  if (!/^[\w\-/]+$/.test(name) || name.includes("..")) {
    return Response.json({ error: "Nombre de función inválido" }, { status: 400 });
  }
  try {
    const h = await load(name);
    if (!h) return Response.json({ error: `Función no encontrada: ${name}` }, { status: 404 });
    return await h(req);
  } catch (e) {
    console.error(`[${name}]`, e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
