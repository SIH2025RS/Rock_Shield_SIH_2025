import argparse
import numpy as np
import rasterio
import cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def color_relief(dem_tif: str, out_png: str = 'elevation_color.png', cmap: str = 'terrain', with_legend: bool = True):
	with rasterio.open(dem_tif) as src:
		z = src.read(1).astype(np.float32)
	mask = ~np.isfinite(z)
	z[mask] = np.nan
	vmin = np.nanpercentile(z, 2)
	vmax = np.nanpercentile(z, 98)
	if not np.isfinite(vmin) or not np.isfinite(vmax) or vmax <= vmin:
		vmin, vmax = np.nanmin(z), np.nanmax(z)
		if not np.isfinite(vmin) or not np.isfinite(vmax) or vmax <= vmin:
			vmin, vmax = 0.0, 1.0
	norm = (z - vmin) / (vmax - vmin + 1e-9)
	norm = np.clip(norm, 0, 1)
	cm = plt.get_cmap(cmap)
	rgba = (cm(norm) * 255).astype(np.uint8)
	rgb = cv2.cvtColor(rgba, cv2.COLOR_RGBA2RGB)
	cv2.imwrite(out_png, rgb)
	print(f"Saved {out_png}")

	if with_legend:
		fig, ax = plt.subplots(figsize=(5, 1))
		fig.subplots_adjust(bottom=0.5)
		norm_mpl = matplotlib.colors.Normalize(vmin=vmin, vmax=vmax)
		cb1 = matplotlib.colorbar.ColorbarBase(ax, cmap=plt.get_cmap(cmap), norm=norm_mpl, orientation='horizontal')
		cb1.set_label('Elevation (relative units)')
		legend_path = out_png.replace('.png', '_legend.png')
		fig.savefig(legend_path, dpi=150, bbox_inches='tight')
		plt.close(fig)
		print(f"Saved {legend_path}")


if __name__ == '__main__':
	p = argparse.ArgumentParser()
	p.add_argument('--dem', default='elevation.tif')
	p.add_argument('--out', default='elevation_color.png')
	p.add_argument('--cmap', default='terrain')
	p.add_argument('--no-legend', action='store_true')
	args = p.parse_args()
	color_relief(args.dem, args.out, args.cmap, with_legend=not args.no_legend)
