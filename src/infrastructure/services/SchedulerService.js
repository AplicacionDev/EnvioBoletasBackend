const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(process.cwd(), "config", "scheduler-config.json");
const MAX_HISTORY = 50;

class SchedulerService {
  constructor(procesarBoletasPendientes) {
    this.procesarBoletasPendientes = procesarBoletasPendientes;
    this.task = null;
    this.running = false;
    this.history = [];
    this.config = this.#loadConfig();
  }

  // ── Config ────────────────────────────────────────────

  #loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return { enabled: false, cronExpression: "0 7 15 * *", description: "", timezone: "America/Guatemala" };
    }
  }

  #saveConfig() {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2) + "\n", "utf-8");
  }

  // ── Cron lifecycle ────────────────────────────────────

  start() {
    if (this.config.enabled) {
      this.#schedule();
      console.log(`[Scheduler] Iniciado — cron: "${this.config.cronExpression}" (${this.config.timezone})`);
    } else {
      console.log("[Scheduler] Deshabilitado. Activar vía PUT /api/scheduler");
    }
  }

  #schedule() {
    this.#stop();

    if (!cron.validate(this.config.cronExpression)) {
      console.error(`[Scheduler] Expresión cron inválida: "${this.config.cronExpression}"`);
      return;
    }

    this.task = cron.schedule(this.config.cronExpression, () => this.#execute("scheduled"), {
      timezone: this.config.timezone,
    });
  }

  #stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  // ── Execution ─────────────────────────────────────────

  async #execute(trigger) {
    if (this.running) {
      console.log("[Scheduler] Ya hay una ejecución en curso, se omite.");
      return { ok: false, message: "Ya hay una ejecución en curso" };
    }

    this.running = true;
    const startTime = new Date();
    console.log(`[Scheduler] Ejecución iniciada (${trigger}) — ${startTime.toISOString()}`);

    const entry = { trigger, startTime: startTime.toISOString(), status: "running" };

    try {
      const result = await this.procesarBoletasPendientes.execute();
      entry.status = "success";
      entry.result = result;
      console.log(`[Scheduler] Ejecución completada — ${JSON.stringify(result)}`);
      return { ok: true, ...result };
    } catch (err) {
      entry.status = "error";
      entry.error = err.message;
      console.error(`[Scheduler] Error en ejecución — ${err.message}`);
      throw err;
    } finally {
      entry.endTime = new Date().toISOString();
      entry.durationMs = new Date(entry.endTime) - startTime;
      this.history.unshift(entry);
      if (this.history.length > MAX_HISTORY) this.history.length = MAX_HISTORY;
      this.running = false;
    }
  }

  // ── Public API (used by controller) ───────────────────

  async runNow() {
    return this.#execute("manual");
  }

  updateConfig({ enabled, cronExpression, description, timezone }) {
    if (cronExpression !== undefined) {
      if (!cron.validate(cronExpression)) {
        throw new Error(`Expresión cron inválida: "${cronExpression}"`);
      }
      this.config.cronExpression = cronExpression;
    }
    if (description !== undefined) this.config.description = description;
    if (timezone !== undefined) this.config.timezone = timezone;
    if (enabled !== undefined) this.config.enabled = enabled;

    this.#saveConfig();

    if (this.config.enabled) {
      this.#schedule();
    } else {
      this.#stop();
    }

    return this.getStatus();
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      cronExpression: this.config.cronExpression,
      description: this.config.description,
      timezone: this.config.timezone,
      running: this.running,
      nextExpressionValid: cron.validate(this.config.cronExpression),
    };
  }

  getHistory(limit = 20) {
    return this.history.slice(0, limit);
  }
}

module.exports = { SchedulerService };
