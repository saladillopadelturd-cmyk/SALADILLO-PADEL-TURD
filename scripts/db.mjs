#!/usr/bin/env node

/**
 * SPT Database CLI Tool (scripts/db.mjs)
 * 
 * Herramienta CLI de alto rendimiento para inspeccionar y operar la base de datos de Supabase.
 * - Conexión directa mediante REST API nativa (fetch) con service_role.
 * - Cero tiempo de arranque (sin tsx ni librerías pesadas).
 * - Respuestas en <300ms formateadas en tabla ASCII o JSON.
 * 
 * Uso:
 *   node scripts/db.mjs stats
 *   node scripts/db.mjs tables
 *   node scripts/db.mjs schema [table]
 *   node scripts/db.mjs players [query]
 *   node scripts/db.mjs tournaments [status]
 *   node scripts/db.mjs rankings [gender] [category]
 *   node scripts/db.mjs matches [tournament_id]
 *   node scripts/db.mjs couples [tournament_id]
 *   node scripts/db.mjs get <table> [select] [filter] [limit]
 *   node scripts/db.mjs insert <table> '<json>'
 *   node scripts/db.mjs update <table> <id> '<json>'
 *   node scripts/db.mjs delete <table> <id>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPaths = [
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env'),
    path.join(process.cwd(), '.env.local'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY no están configuradas en .env.local');
  process.exit(1);
}

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function api(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${errorText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    return await res.json();
  }
  return await res.text();
}

// Formateador de tablas ASCII
function printTable(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log('  (Sin registros)');
    return;
  }

  const cols = columns || Object.keys(rows[0]);
  const widths = {};

  cols.forEach(col => {
    widths[col] = col.length;
    rows.forEach(row => {
      const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '-';
      widths[col] = Math.max(widths[col], Math.min(val.length, 40));
    });
  });

  const header = cols.map(col => col.padEnd(widths[col])).join(' | ');
  const separator = cols.map(col => '-'.repeat(widths[col])).join('-+-');

  console.log(`\n  ${header}`);
  console.log(`  ${separator}`);

  rows.forEach(row => {
    const line = cols.map(col => {
      let val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '-';
      if (val.length > 40) val = val.slice(0, 37) + '...';
      return val.padEnd(widths[col]);
    }).join(' | ');
    console.log(`  ${line}`);
  });
  console.log(`\n  Total: ${rows.length} registros\n`);
}

// -------------------------------------------------------------
// COMANDOS
// -------------------------------------------------------------

async function cmdStats() {
  const tables = ['players', 'tournaments', 'matches', 'couples', 'rankings', 'profiles', 'zones'];
  console.log('\n📊 Estado General de la Base de Datos (Supabase SPT):\n');

  const results = [];
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        method: 'HEAD',
        headers: {
          ...HEADERS,
          Prefer: 'count=exact',
        },
      });
      const range = res.headers.get('content-range') || '0-0/0';
      const count = range.split('/')[1] || '0';
      results.push({ Tabla: table, Registros: Number(count) });
    } catch {
      results.push({ Tabla: table, Registros: 'Error' });
    }
  }

  printTable(results);
}

async function cmdTables() {
  const openApi = await api('/?apikey=' + SUPABASE_KEY);
  const defs = Object.keys(openApi.definitions || {});
  console.log('\n📁 Tablas y Vistas Disponibles:');
  const list = defs.map(d => ({ Nombre: d }));
  printTable(list);
}

async function cmdSchema(table) {
  const openApi = await api('/?apikey=' + SUPABASE_KEY);
  const defs = openApi.definitions || {};

  if (table) {
    const target = defs[table];
    if (!target) {
      console.error(`❌ Tabla '${table}' no encontrada en el esquema.`);
      return;
    }
    console.log(`\n📐 Esquema de la tabla: ${table}\n`);
    const props = target.properties || {};
    const rows = Object.entries(props).map(([col, def]) => ({
      Columna: col,
      Tipo: def.type || def.format || 'text',
      Requerido: (target.required || []).includes(col) ? 'Sí' : 'No',
      Descripcion: def.description || '-',
    }));
    printTable(rows);
  } else {
    for (const [tName, target] of Object.entries(defs)) {
      console.log(`\n📐 Tabla: ${tName} (${Object.keys(target.properties || {}).length} columnas)`);
      const cols = Object.keys(target.properties || {}).join(', ');
      console.log(`   Columnas: ${cols}`);
    }
  }
}

async function cmdPlayers(query) {
  let endpoint = '/players?select=id,first_name,last_name,gender,category,phone,email,is_observed&order=last_name.asc';
  if (query) {
    endpoint += `&or=(first_name.ilike.*${encodeURIComponent(query)}*,last_name.ilike.*${encodeURIComponent(query)}*,category.ilike.*${encodeURIComponent(query)}*,gender.ilike.*${encodeURIComponent(query)}*,email.ilike.*${encodeURIComponent(query)}*)`;
  }

  console.log(`\n🎾 Jugadores Registrados${query ? ` (Filtro: "${query}")` : ''}:`);
  const players = await api(endpoint);
  printTable(players, ['id', 'first_name', 'last_name', 'gender', 'category', 'is_observed', 'phone', 'email']);
}

async function cmdTournaments(status) {
  let endpoint = '/tournaments?select=id,name,category,gender,status,date,game_mode&order=date.desc';
  if (status) {
    endpoint += `&status=eq.${encodeURIComponent(status)}`;
  }

  console.log(`\n🏆 Torneos${status ? ` (Estado: ${status})` : ''}:`);
  const tournaments = await api(endpoint);
  printTable(tournaments, ['id', 'name', 'category', 'gender', 'status', 'date', 'game_mode']);
}

async function cmdRankings(gender, category) {
  let endpoint = '/rankings?select=id,ranking_type,category,points,tournaments_played,matches_won,matches_lost,player_id,player1_id,player2_id&order=points.desc';
  if (category && category !== 'all') {
    endpoint += `&category=eq.${encodeURIComponent(category)}`;
  }

  const [rawRankings, players] = await Promise.all([
    api(endpoint),
    api('/players?select=id,first_name,last_name,gender,category'),
  ]);

  const pMap = new Map((players || []).map(p => [p.id, p]));

  let enriched = (rawRankings || []).map(r => {
    if (r.ranking_type === 'individual') {
      const p = pMap.get(r.player_id);
      return {
        id: r.id,
        tipo: 'individual',
        jugador: p ? `${p.first_name} ${p.last_name}` : (r.player_id || '-'),
        rama: p?.gender || 'Masculino',
        categoria: p?.category || r.category,
        puntos: r.points,
        torneos: r.tournaments_played,
        pg: r.matches_won,
        pp: r.matches_lost,
      };
    } else {
      const p1 = pMap.get(r.player1_id);
      const p2 = pMap.get(r.player2_id);
      const p1Name = p1 ? `${p1.first_name} ${p1.last_name}` : 'P1';
      const p2Name = p2 ? `${p2.first_name} ${p2.last_name}` : 'P2';
      const cGender = (p1?.gender === 'Femenino' && p2?.gender === 'Femenino') ? 'Femenino' : 'Masculino';
      return {
        id: r.id,
        tipo: 'pareja',
        jugador: `${p1Name} / ${p2Name}`,
        rama: cGender,
        categoria: r.category,
        puntos: r.points,
        torneos: r.tournaments_played,
        pg: r.matches_won,
        pp: r.matches_lost,
      };
    }
  });

  if (gender) {
    const isFem = gender.toLowerCase().startsWith('fem') || gender.toLowerCase().startsWith('dam');
    const target = isFem ? 'Femenino' : 'Masculino';
    enriched = enriched.filter(r => r.rama === target);
  }

  console.log(`\n🏅 Rankings Oficiales${gender ? ` (Rama: ${gender})` : ''}${category ? ` (Cat: ${category})` : ''}:`);
  printTable(enriched, ['jugador', 'rama', 'categoria', 'puntos', 'torneos', 'pg', 'pp']);
}

async function cmdMatches(tournamentId) {
  let endpoint = '/matches?select=id,stage,round,scheduled_time,court_id,status,winner_id,score_sets&order=stage.asc';
  if (tournamentId) {
    endpoint += `&tournament_id=eq.${encodeURIComponent(tournamentId)}`;
  }

  console.log(`\n⚔️ Partidos${tournamentId ? ` del Torneo: ${tournamentId}` : ''}:`);
  const matches = await api(endpoint);
  printTable(matches, ['id', 'stage', 'status', 'scheduled_time', 'court_id', 'winner_id', 'score_sets']);
}

async function cmdCouples(tournamentId) {
  let endpoint = '/couples?select=id,tournament_id,player1_id,player2_id,group_id,seed';
  if (tournamentId) {
    endpoint += `&tournament_id=eq.${encodeURIComponent(tournamentId)}`;
  }

  const [couples, players] = await Promise.all([
    api(endpoint),
    api('/players?select=id,first_name,last_name,category'),
  ]);

  const pMap = new Map((players || []).map(p => [p.id, p]));
  const rows = (couples || []).map(c => {
    const p1 = pMap.get(c.player1_id);
    const p2 = pMap.get(c.player2_id);
    return {
      id: c.id,
      torneo: c.tournament_id,
      pareja: `${p1 ? `${p1.first_name} ${p1.last_name} (${p1.category})` : c.player1_id} / ${p2 ? `${p2.first_name} ${p2.last_name} (${p2.category})` : c.player2_id}`,
      seed: c.seed || '-',
      grupo: c.group_id || '-',
    };
  });

  console.log(`\n👥 Parejas${tournamentId ? ` del Torneo: ${tournamentId}` : ''}:`);
  printTable(rows, ['id', 'pareja', 'seed', 'grupo']);
}

async function cmdGet(table, select = '*', filter = '', limit = '50') {
  let endpoint = `/${table}?select=${encodeURIComponent(select)}&limit=${limit}`;
  if (filter) {
    endpoint += `&${filter}`;
  }

  console.log(`\n🔍 Consulta en tabla '${table}':`);
  const data = await api(endpoint);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printTable(data);
  }
}

async function cmdInsert(table, jsonStr) {
  const body = JSON.parse(jsonStr);
  const data = await api(`/${table}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log(`✅ Registro insertado en '${table}':`, data);
}

async function cmdUpdate(table, id, jsonStr) {
  const body = JSON.parse(jsonStr);
  const data = await api(`/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  console.log(`✅ Registro ${id} actualizado en '${table}':`, data);
}

async function cmdDelete(table, id) {
  const data = await api(`/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  console.log(`🗑️ Registro ${id} eliminado de '${table}':`, data);
}

// -------------------------------------------------------------
// MAIN DISPATCHER
// -------------------------------------------------------------
async function main() {
  const [, , cmd, ...args] = process.argv;

  const t0 = performance.now();

  try {
    switch (cmd) {
      case 'stats':
        await cmdStats();
        break;
      case 'tables':
        await cmdTables();
        break;
      case 'schema':
        await cmdSchema(args[0]);
        break;
      case 'players':
        await cmdPlayers(args[0]);
        break;
      case 'tournaments':
        await cmdTournaments(args[0]);
        break;
      case 'rankings':
        await cmdRankings(args[0], args[1]);
        break;
      case 'matches':
        await cmdMatches(args[0]);
        break;
      case 'couples':
        await cmdCouples(args[0]);
        break;
      case 'get':
        await cmdGet(args[0], args[1], args[2], args[3]);
        break;
      case 'insert':
        await cmdInsert(args[0], args[1]);
        break;
      case 'update':
        await cmdUpdate(args[0], args[1], args[2]);
        break;
      case 'delete':
        await cmdDelete(args[0], args[1]);
        break;
      default:
        console.log(`
Saladillo Padel Tour - Database CLI
Uso: node scripts/db.mjs <comando> [argumentos]

Comandos disponibles:
  stats                      Resumen general de registros en todas las tablas
  tables                     Lista todas las tablas y vistas disponibles
  schema [tabla]             Estructura y columnas de una tabla
  players [query]            Buscar jugadores por nombre, categoría, género, etc.
  tournaments [status]       Listar torneos (draft, zones, playoffs, finished)
  rankings [rama] [cat]      Listar rankings (ej. rankings Damas 5ta)
  matches [tournament_id]    Listar partidos de un torneo
  couples [tournament_id]    Listar parejas de un torneo
  get <tabla> [select]       Consulta libre a cualquier tabla
  insert <tabla> '<json>'    Insertar registro
  update <tabla> <id> '<json>' Actualizar registro
  delete <tabla> <id>        Eliminar registro
`);
        break;
    }
  } catch (err) {
    console.error('\n❌ Error en operación de base de datos:', err.message);
    process.exit(1);
  } finally {
    const elapsed = (performance.now() - t0).toFixed(0);
    console.log(`⏱️ Tiempo de respuesta: ${elapsed} ms\n`);
  }
}

main();
