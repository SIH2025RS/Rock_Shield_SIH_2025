import argparse
import numpy as np
import rasterio
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa


def render(dem_path: str, out_png: str = "dem_3d.png", max_dim: int = 800):
	with rasterio.open(dem_path) as src:
		z = src.read(1).astype(float)
	h, w = z.shape
	x = np.arange(w)
	y = np.arange(h)
	X, Y = np.meshgrid(x, y)
	step = max(1, min(h, w) // max_dim)
	X, Y, Z = X[::step, ::step], Y[::step, ::step], z[::step, ::step]
	fig = plt.figure(figsize=(10, 7))
	ax = fig.add_subplot(111, projection='3d')
	ax.plot_surface(X, Y, Z, cmap='terrain', linewidth=0, antialiased=False)
	ax.set_title(f'DEM 3D Surface: {dem_path}')
	ax.set_axis_off()
	plt.tight_layout()
	plt.savefig(out_png, dpi=150)
	print(f"Saved {out_png}")


if __name__ == "__main__":
	p = argparse.ArgumentParser()
	p.add_argument("--dem", default="dem_nigahi.tif")
	p.add_argument("--out", default="dem_3d.png")
	p.add_argument("--max_dim", type=int, default=800)
	args = p.parse_args()
	render(args.dem, args.out, args.max_dim)
