import argparse
import numpy as np
import rasterio
import plotly.graph_objects as go


def plot_drape(dem_tif: str, rgb_png: str, out_html: str = 'dem_3d_drape.html', downsample: int = 2):
	with rasterio.open(dem_tif) as src:
		z = src.read(1).astype(float)
	h, w = z.shape
	# Read PNG as texture if provided
	tex = None
	if rgb_png:
		import imageio.v2 as iio
		tex = iio.imread(rgb_png)
		if tex.ndim == 3 and tex.shape[2] == 4:
			tex = tex[:, :, :3]
		tex = tex.astype(float) / 255.0
	# Downsample
	z_ds = z[::downsample, ::downsample]
	if tex is not None:
		tex = tex[::downsample, ::downsample, :]
	fig = go.Figure(data=[go.Surface(z=z_ds, surfacecolor=None, colorscale='Earth')])
	if tex is not None:
		# Plotly surface textures are not native; approximate using surfacecolor from grayscale
		gray = (0.2989*tex[:,:,0] + 0.5870*tex[:,:,1] + 0.1140*tex[:,:,2])
		fig.data[0].update(surfacecolor=gray, colorscale='gray')
	fig.update_layout(title='DEM 3D Draped', autosize=True, width=1000, height=800)
	fig.write_html(out_html)
	print(f"Saved {out_html}")


if __name__ == '__main__':
	p = argparse.ArgumentParser()
	p.add_argument('--dem', default='dem_nigahi.tif')
	p.add_argument('--rgb', default='sample_nigahi.png')
	p.add_argument('--out', default='dem_3d_drape.html')
	p.add_argument('--downsample', type=int, default=2)
	args = p.parse_args()
	plot_drape(args.dem, args.rgb, args.out, args.downsample)
