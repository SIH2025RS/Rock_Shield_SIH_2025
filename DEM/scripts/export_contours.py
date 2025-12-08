import argparse
import json
import numpy as np
import rasterio
from skimage import measure


def export_contours(dem_tif: str, out_geojson: str = 'contours.geojson', levels: int = 10):
	with rasterio.open(dem_tif) as src:
		z = src.read(1).astype(np.float32)
		transform = src.transform

	vmin = np.nanmin(z)
	vmax = np.nanmax(z)
	if not np.isfinite(vmin) or not np.isfinite(vmax) or vmax <= vmin:
		raise RuntimeError('Invalid raster values for contours')
	vals = np.linspace(vmin, vmax, levels)

	features = []
	for v in vals:
		contours = measure.find_contours(z, v)
		for c in contours:
			coords = []
			for (row, col) in c:
				x = transform.c + col * transform.a + row * transform.b
				y = transform.f + col * transform.d + row * transform.e
				coords.append([float(x), float(y)])
			if len(coords) >= 2:
				features.append({
					"type": "Feature",
					"properties": {"elev": float(v)},
					"geometry": {"type": "LineString", "coordinates": coords}
				})

	geojson = {"type": "FeatureCollection", "features": features}
	with open(out_geojson, 'w') as f:
		json.dump(geojson, f)
	print(f"Saved {out_geojson} with {len(features)} features")


if __name__ == '__main__':
	p = argparse.ArgumentParser()
	p.add_argument('--dem', default='elevation.tif')
	p.add_argument('--out', default='contours.geojson')
	p.add_argument('--levels', type=int, default=10)
	args = p.parse_args()
	export_contours(args.dem, args.out, args.levels)
