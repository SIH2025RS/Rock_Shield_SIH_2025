import argparse
import numpy as np
import xarray as xr
import rioxarray  # noqa: F401
from pystac_client import Client
import planetary_computer as pc
from odc.stac import stac_load

SITES = {
	"gevra": {"name": "Gevra OCP", "lon": 82.6978, "lat": 22.3519},
	"nigahi": {"name": "Nigahi OCP", "lon": 82.7079, "lat": 24.1448},
	"jayant": {"name": "Jayant OCP", "lon": 82.6744, "lat": 24.1416},
}


def bbox_from_point(lon: float, lat: float, km: float = 5.0):
	# Approximate degrees per km
	dlon = km / 111.32
	dlat = km / 110.57
	return [lon - dlon, lat - dlat, lon + dlon, lat + dlat]


def true_color(ds: xr.Dataset) -> xr.DataArray:
	# Sentinel-2 L2A band names as per MPC: B02, B03, B04 at 10m
	r = ds["B04"].astype("float32")
	g = ds["B03"].astype("float32")
	b = ds["B02"].astype("float32")
	# Simple gamma and scaling
	stack = xr.concat([r, g, b], dim="band")
	q = float(stack.quantile(0.98))
	stack = stack / (q + 1e-6)
	stack = stack.clip(0, 1) ** (1/2.2)
	# convert to uint8 [0,255]
	stack = (stack * 255.0).round().clip(0, 255).astype("uint8")
	return stack


def fetch_latest_png(site_key: str, out_path: str, max_cloud: int = 10, months: int = 18):
	if site_key not in SITES:
		raise ValueError(f"Unknown site '{site_key}'. Choose from: {', '.join(SITES.keys())}")
	site = SITES[site_key]
	bbox = bbox_from_point(site["lon"], site["lat"], km=5)

	cat = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
	search = cat.search(
		collections=["sentinel-2-l2a"],
		bbox=bbox,
		max_items=20,
		query={"eo:cloud_cover": {"lt": max_cloud}},
		sortby=[{"field": "properties\u005fdatetime", "direction": "desc"}],
	)
	items = list(search.get_items())
	if not items:
		raise RuntimeError("No suitable Sentinel-2 items found. Try increasing cloud_cover or months.")
	items = [pc.sign(item) for item in items]

	ds = stac_load(
		items,
		bands=["B02", "B03", "B04"],
		bbox=bbox,
		resolution=10,
		chunks={},
		groupby="solar_day",
		nodata=0,
	).isel(time=0)

	png = true_color(ds)
	# rioxarray expects (band, y, x)
	png = png.transpose("band", "y", "x")
	png.rio.to_raster(out_path, driver="PNG")
	print(f"Saved {out_path} for {site['name']}")


if __name__ == "__main__":
	ap = argparse.ArgumentParser()
	ap.add_argument("--site", required=True, choices=list(SITES.keys()))
	ap.add_argument("--out", required=True)
	ap.add_argument("--cloud", type=int, default=10)
	args = ap.parse_args()
	fetch_latest_png(args.site, args.out, max_cloud=args.cloud)
