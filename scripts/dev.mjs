import { spawn, execSync } from "node:child_process";

const PORT = process.env.PORT || 3000;
const isWin = process.platform === "win32";

// Libera a porta antes de iniciar (evita EADDRINUSE)
function killPort(port) {
  try {
    if (isWin) {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of result.split("\n")) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) pids.add(match[1]);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`[dev] Processo ${pid} finalizado (porta ${port} liberada).`);
        } catch {}
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
    }
  } catch {
    // Porta já estava livre, tudo ok
  }
}

killPort(PORT);

// No Windows, rodamos como string única com shell (evita o DEP0190 do Node:
// args array + shell:true é deprecado). Fora do Windows, spawn direto sem shell.
const child = isWin
  ? spawn(`npx next dev -p ${PORT}`, {
      stdio: "inherit",
      shell: true,
    })
  : spawn("npx", ["next", "dev", "-p", String(PORT)], {
      stdio: "inherit",
    });

const open = () => {
  const url = `http://localhost:${PORT}`;
  if (isWin) {
    spawn("cmd", ["/c", "start", url], { stdio: "ignore", detached: true }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  } else {
    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }
};

let opened = false;
const check = () => {
  fetch(`http://localhost:${PORT}`)
    .then(() => {
      if (!opened) {
        opened = true;
        open();
        clearInterval(timer);
      }
    })
    .catch(() => {});
};

const timer = setInterval(check, 500);

// Ctrl+C / SIGTERM: mata a árvore de processos no Windows corretamente
const shutdown = () => {
  clearInterval(timer);
  if (isWin && child.pid) {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {}
  } else {
    child.kill("SIGTERM");
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  clearInterval(timer);
  process.exit(code ?? 0);
});
