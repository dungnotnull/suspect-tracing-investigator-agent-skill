/**
 * Distance providers for geographic profiling.
 *
 * The default HaversineProvider computes great-circle distance offline. The
 * OsrmProvider calls an OSRM `/table/v1/driving/` endpoint (with `annotations=
 * distance`) to return road-network distances in km, batching all origins x
 * destinations in a single request. When OSRM is selected but unreachable or
 * not configured, the provider falls back to Haversine and logs a warning —
 * so production callers get graceful degradation without crashing.
 *
 * No external dependency beyond Node's https module.
 */

import { request } from 'https';
import { Logger } from './index';
import { OffenseSiteInput } from './tools';

export interface LatLng { lat: number; lon: number; }

export interface DistanceProvider {
  readonly name: string;
  /** Returns distances in km; matrix[i][j] = origin i -> destination j. */
  distances(origins: LatLng[], destinations: LatLng[]): Promise<number[][]>;
}

/** Great-circle (Haversine) distance in km — offline, deterministic. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class HaversineProvider implements DistanceProvider {
  readonly name = 'haversine';
  async distances(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    return origins.map(o => destinations.map(d => haversineKm(o, d)));
  }
}

/**
 * OSRM table-service provider. Builds a single GET to
 *   {baseUrl}/table/v1/driving/{coords...}?annotations=distance&sources=...&destinations=...
 * and parses the `distances` matrix (metres) into km. Falls back to Haversine
 * on any error (network failure, missing baseUrl, malformed response).
 */
export class OsrmProvider implements DistanceProvider {
  readonly name = 'osrm';
  private readonly fallback = new HaversineProvider();
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger = Logger.getInstance();

  constructor(baseUrl?: string, timeoutMs = 8000) {
    this.baseUrl = (baseUrl ?? '').replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  async distances(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    if (!this.baseUrl) {
      this.logger.warn('OSRM distance mode selected but osrmBaseUrl is not set; falling back to haversine.');
      return this.fallback.distances(origins, destinations);
    }
    // OSRM expects coords as lon,lat separated by ';'. Sources/destinations are
    // indices into the concatenated coordinate list (origins first, then
    // destinations). Deduplicate identical coords to stay under URL limits.
    const all: LatLng[] = [...origins, ...destinations];
    const coordStr = all.map(c => `${c.lon},${c.lat}`).join(';');
    const sources = origins.map((_, i) => i).join(',');
    const dests = destinations.map((_, i) => i + origins.length).join(',');
    const url = `${this.baseUrl}/table/v1/driving/${coordStr}?annotations=distance&sources=${sources}&destinations=${dests}`;

    try {
      const json = await this.httpGetJson(url);
      const dist = json?.distances as number[][] | undefined;
      if (!Array.isArray(dist) || dist.length !== origins.length) {
        throw new Error('OSRM response missing valid distances matrix');
      }
      // Convert metres -> km.
      return dist.map(row => (Array.isArray(row) ? row.map(m => m / 1000) : []));
    } catch (err) {
      this.logger.warn('OSRM distance request failed; falling back to haversine', {
        error: err instanceof Error ? err.message : String(err)
      });
      return this.fallback.distances(origins, destinations);
    }
  }

  private httpGetJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = request(url, { timeout: this.timeoutMs, method: 'GET' }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`OSRM HTTP ${res.statusCode}`));
            return;
          }
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('OSRM response not valid JSON')); }
        });
      });
      req.on('timeout', () => { req.destroy(new Error('OSRM request timed out')); });
      req.on('error', reject);
      req.end();
    });
  }
}

export function createDistanceProvider(mode: 'haversine' | 'osrm' = 'haversine', osrmBaseUrl?: string): DistanceProvider {
  switch (mode) {
    case 'osrm': return new OsrmProvider(osrmBaseUrl);
    case 'haversine':
    default: return new HaversineProvider();
  }
}

/**
 * Compute a Rossmo CGT score from precomputed distances (km) to offense sites.
 * Mirrors rossmoScore in tools.ts but uses a distance vector instead of
 * recomputing haversine — enabling road-network distance modes.
 */
export function rossmoScoreFromDistances(
  distancesKm: number[],
  sites: OffenseSiteInput[],
  bufferZoneKm: number
): number {
  let total = 0;
  for (let i = 0; i < sites.length; i++) {
    const d = distancesKm[i] ?? Infinity;
    const phi = sites[i].weight ?? 1;
    let contribution: number;
    if (d > bufferZoneKm) contribution = phi / Math.pow(d, 2);
    else if (d > 0) contribution = phi * (1 - d / bufferZoneKm);
    else contribution = phi;
    total += contribution;
  }
  return total;
}
