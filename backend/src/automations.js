// Automatizaciones: equivalentes a los "workflows" de Base44.
// settings.automations = [
//   { "type": "entity", "entity": "Workshop", "events": ["create","update"], "function": "syncWorkshopToPg" },
//   { "type": "cron", "cron": "0 9 * * *", "function": "dailyAdminSummary", "payload": {} }
// ]
import cron from 'node-cron';
import { onEntityEvent } from './realtime.js';
import { invokeFunction } from './functions.js';
import { listTenants, getTenant } from './tenants.js';

const jobs = new Map();

async function run(tenant, fn, payload) {
  try {
    const res = await invokeFunction(tenant, fn, {
      body: JSON.stringify(payload || {}),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) console.error(`[automatización ${tenant.slug}/${fn}] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  } catch (e) {
    console.error(`[automatización ${tenant.slug}/${fn}]`, e.message);
  }
}

onEntityEvent(async (tenant, entity, type, record) => {
  const autos = (tenant.settings.automations || []).filter(
    (a) => a.type === 'entity' && a.entity === entity && (!a.events || a.events.includes(type))
  );
  for (const a of autos) {
    await run(tenant, a.function, {
      event: { type, entity_name: entity, entity_id: record?.id },
      data: record,
      ...(a.payload || {}),
    });
  }
});

export async function scheduleTenant(appId) {
  for (const [key, job] of jobs) {
    if (key.startsWith(`${appId}:`)) {
      job.stop();
      jobs.delete(key);
    }
  }
  const tenant = await getTenant(appId);
  (tenant.settings.automations || [])
    .filter((a) => a.type === 'cron' && cron.validate(a.cron))
    .forEach((a, i) => {
      const job = cron.schedule(
        a.cron,
        async () => run(await getTenant(appId), a.function, a.payload),
        { timezone: tenant.settings.timezone || 'America/Mexico_City' }
      );
      jobs.set(`${appId}:${i}`, job);
    });
}

export async function scheduleAll() {
  for (const t of await listTenants()) {
    await scheduleTenant(t.app_id).catch((e) => console.error('[cron]', t.slug, e.message));
  }
}
