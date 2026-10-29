/**
 * Real imagery of the JH-UG site (Jharia coalfield, Dhanbad) for the terrain and map scenes.
 *
 * - Mapbox Static Images (satellite) at three zooms: region, district, site
 * - Mapbox Terrain-DEM v1 elevation (SRTM-derived) for the site box → public/site/dem.json
 *   (OpenTopography's free key allows only 50 calls/day, which the backend already uses up.)
 *
 * The Mapbox token is read from the app's existing frontend/.env. Elevation tiles are decoded
 * with ffmpeg, which is already installed.
 *   npx tsx scripts/fetch-site-assets.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const REPO = resolve(ROOT, "..");
const OUT = join(ROOT, "public", "site");
const dataset = JSON.parse(readFileSync(join(ROOT, "public", "data", "dataset.json"), "utf8"));

const LAT: number = dataset.lat;
const LON: number = dataset.lon;
// ~6.6 km square around the five sensor patches
const HALF = 0.03;
const BOX = { south: LAT - HALF, north: LAT + HALF, west: LON - HALF, east: LON + HALF };

function envValue(file: string, key: string): string {
  const line = readFileSync(join(REPO, file), "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  const value = line?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
  if (!value) throw new Error(`${key} missing in ${file}`);
  return value;
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.replace(/(access_token|API_Key)=[^&]+/, "$1=***")}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`  wrote ${dest.replace(ROOT + "/", "")}`);
}

const DEM_ZOOM = 13;
const TILE_PX = 512; // @2x
const GRID = 200; // output mesh resolution

const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/** Fetch Terrain-DEM tiles covering BOX, decode RGB → metres, resample to GRID x GRID (north at row 0). */
async function fetchElevation(token: string) {
  const x0 = Math.floor(lonToX(BOX.west, DEM_ZOOM)), x1 = Math.floor(lonToX(BOX.east, DEM_ZOOM));
  const y0 = Math.floor(latToY(BOX.north, DEM_ZOOM)), y1 = Math.floor(latToY(BOX.south, DEM_ZOOM));
  const tiles = new Map<string, Buffer>();
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/${DEM_ZOOM}/${x}/${y}@2x.pngraw?access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Terrain-DEM tile ${x}/${y}: ${res.status}`);
      const png = Buffer.from(await res.arrayBuffer());
      tiles.set(`${x}/${y}`, execFileSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { input: png, maxBuffer: 64 << 20 }));
    }
  }
  const heightAt = (lat: number, lon: number) => {
    const fx = lonToX(lon, DEM_ZOOM), fy = latToY(lat, DEM_ZOOM);
    const tx = Math.floor(fx), ty = Math.floor(fy);
    const px = Math.min(TILE_PX - 1, Math.floor((fx - tx) * TILE_PX)), py = Math.min(TILE_PX - 1, Math.floor((fy - ty) * TILE_PX));
    const rgb = tiles.get(`${tx}/${ty}`)!;
    const i = (py * TILE_PX + px) * 3;
    return -10000 + (rgb[i] * 65536 + rgb[i + 1] * 256 + rgb[i + 2]) * 0.1;
  };
  const values: number[][] = [];
  for (let r = 0; r < GRID; r++) {
    const lat = BOX.north - ((r + 0.5) / GRID) * (BOX.north - BOX.south);
    const row: number[] = [];
    for (let c = 0; c < GRID; c++) row.push(Math.round(heightAt(lat, BOX.west + ((c + 0.5) / GRID) * (BOX.east - BOX.west)) * 10) / 10);
    values.push(row);
  }
  return { values, tiles: tiles.size };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const token = envValue("frontend/.env", "VITE_MAPBOX_TOKEN");

  const style = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static";
  const opts = `@2x?access_token=${token}&attribution=false&logo=false`;
  await download(`${style}/${LON},${LAT},10.5,0/1280x720${opts}`, join(OUT, "sat-region.jpg"));
  await download(`${style}/${LON},${LAT},13,0/1280x720${opts}`, join(OUT, "sat-district.jpg"));
  await download(`${style}/[${BOX.west},${BOX.south},${BOX.east},${BOX.north}]/1280x1280${opts}`, join(OUT, "sat-site.jpg"));

  const { values, tiles } = await fetchElevation(token);
  const flat = values.flat();
  const dem = {
    source: "Mapbox Terrain-DEM v1 (SRTM-derived)",
    box: BOX,
    ncols: GRID,
    nrows: GRID,
    sizeKm: { ew: (BOX.east - BOX.west) * 111.32 * Math.cos((LAT * Math.PI) / 180), ns: (BOX.north - BOX.south) * 110.57 },
    min: Math.min(...flat),
    max: Math.max(...flat),
    values,
  };
  writeFileSync(join(OUT, "dem.json"), JSON.stringify(dem));
  console.log(`  wrote public/site/dem.json (${GRID}x${GRID} from ${tiles} tiles, ${dem.min}-${dem.max} m)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
