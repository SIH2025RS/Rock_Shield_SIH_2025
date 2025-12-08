import os
import numpy as np
import rasterio
from rasterio.transform import Affine
from scipy.ndimage import maximum_filter, minimum_filter
from whitebox.whitebox_tools import WhiteboxTools


def write_tif(path: str, arr: np.ndarray, transform: Affine):
	with rasterio.open(
		path,
		"w",
		driver="GTiff",
		height=arr.shape[0],
		width=arr.shape[1],
		count=1,
		dtype=rasterio.float32,
		transform=transform,
		crs=None,
	) as dst:
		dst.write(arr.astype(np.float32), 1)


def gradients_horn(z: np.ndarray, cellsize: float = 1.0):
	# Horn (1981) 3x3 kernels for dz/dx and dz/dy
	# Assumes equal x,y cellsize
	kernel_x = np.array([[-1, 0, 1],
						   [-2, 0, 2],
						   [-1, 0, 1]], dtype=np.float32) / (8 * cellsize)
	kernel_y = np.array([[-1, -2, -1],
						   [ 0,  0,  0],
						   [ 1,  2,  1]], dtype=np.float32) / (8 * cellsize)
	from scipy.signal import convolve2d
	dzdx = convolve2d(z, kernel_x, mode='same', boundary='symm')
	dzdy = convolve2d(z, kernel_y, mode='same', boundary='symm')
	return dzdx, dzdy


def slope_aspect(z: np.ndarray, cellsize: float = 1.0):
	dzdx, dzdy = gradients_horn(z, cellsize)
	slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
	slope_deg = np.degrees(slope_rad)
	aspect_rad = np.arctan2(dzdy, -dzdx)
	aspect_deg = (np.degrees(aspect_rad) + 360.0) % 360.0
	return slope_deg, aspect_deg, dzdx, dzdy


def curvatures(z: np.ndarray, cellsize: float = 1.0):
	# Second derivatives via central differences
	from scipy.ndimage import gaussian_filter
	z_s = gaussian_filter(z, sigma=1.0)
	from numpy import gradient
	dy, dx = gradient(z_s, cellsize)
	dyy, dyx = gradient(dy, cellsize)
	dxy, dxx = gradient(dx, cellsize)
	# Profile and plan curvature approximations
	p = dxx
	q = dxy
	r = dyy
	slope_mag = np.sqrt(dx*dx + dy*dy) + 1e-9
	profile = (p*dx*dx + 2*q*dx*dy + r*dy*dy) / (slope_mag**3)
	plan = (p*dy*dy - 2*q*dx*dy + r*dx*dx) / (slope_mag**1)
	return profile, plan


def hillshade(z: np.ndarray, azimuth_deg=315.0, altitude_deg=45.0, cellsize: float = 1.0):
	slope_deg, aspect_deg, dzdx, dzdy = slope_aspect(z, cellsize)
	slope = np.radians(slope_deg)
	aspect = np.radians(aspect_deg)
	az = np.radians(azimuth_deg)
	alt = np.radians(altitude_deg)
	return 255.0 * (np.cos(alt) * np.cos(slope) + np.sin(alt) * np.sin(slope) * np.cos(az - aspect)).clip(0, 1)


def tri(z: np.ndarray, window: int = 3):
	# Terrain Ruggedness Index (Riley): mean of abs diff from center
	pad = window // 2
	from numpy.lib.stride_tricks import sliding_window_view
	w = sliding_window_view(z, (window, window))
	center = w[:, :, pad, pad]
	tri_val = np.mean(np.abs(w - center[:, :, None, None]), axis=(2,3))
	# pad back to original size
	out = np.zeros_like(z, dtype=np.float32)
	out[pad:-pad, pad:-pad] = tri_val
	return out


def derive(dem_path: str):
	with rasterio.open(dem_path) as src:
		dem = src.read(1).astype(np.float32)
		transform = src.transform
		cellsize = float(transform.a) if transform.a != 0 else 1.0

	base_dir = os.path.dirname(os.path.abspath(dem_path))

	# Normalize to a reasonable range for numerical stability
	dem = (dem - dem.min()) / (dem.max() - dem.min() + 1e-9) * 50.0

	# Core terrain attributes
	slope_deg, aspect_deg, dx, dy = slope_aspect(dem, cellsize)
	profile_curv, plan_curv = curvatures(dem, cellsize)
	hshade = hillshade(dem, 315.0, 45.0, cellsize)
	tri_val = tri(dem, window=3)

	# Relief using a neighborhood window
	window = 9
	local_max = maximum_filter(dem, size=window, mode='nearest')
	local_min = minimum_filter(dem, size=window, mode='nearest')
	relief = local_max - local_min

	# Hydrology with WhiteboxTools using absolute paths
	dem_float = os.path.join(base_dir, "dem_float.tif")
	dem_filled = os.path.join(base_dir, "dem_filled.tif")
	flowdir = os.path.join(base_dir, "flowdir.tif")
	flowacc = os.path.join(base_dir, "flowacc.tif")
	write_tif(dem_float, dem, transform)
	wbt = WhiteboxTools()
	wbt.verbose = False
	wbt.work_dir = base_dir
	wbt.breach_depressions(dem_float, dem_filled)
	wbt.d8_pointer(dem_filled, flowdir)
	wbt.d8_flow_accumulation(dem_filled, flowacc, out_type="cells")

	if os.path.exists(flowacc):
		with rasterio.open(flowacc) as fa_src:
			flowacc_arr = fa_src.read(1).astype(np.float32)
	else:
		flowacc_arr = np.zeros_like(dem, dtype=np.float32)

	slope_rad = np.deg2rad(slope_deg)
	twi = np.log((flowacc_arr + 1.0) / (np.tan(slope_rad) + 1e-6)).astype(np.float32)

	layers = {
		"elevation": dem, "slope_deg": slope_deg, "aspect_deg": aspect_deg,
		"plan_curv": plan_curv, "profile_curv": profile_curv,
		"hillshade": hshade, "roughness_TRI": tri_val, "relief": relief,
		"flowacc_cells": flowacc_arr, "twi": twi
	}
	for name, arr in layers.items():
		write_tif(os.path.join(base_dir, f"{name}.tif"), arr, transform)
	print("Wrote:", ", ".join(layers.keys()))


if __name__ == "__main__":
	import argparse
	p = argparse.ArgumentParser()
	p.add_argument("--dem", default="dem.tif")
	args = p.parse_args()
	derive(args.dem)
