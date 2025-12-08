import argparse
import os
import numpy as np
import rasterio
import cv2


def save_png(src_path: str, dst_path: str, mode: str = "gray"):
	with rasterio.open(src_path) as src:
		arr = src.read(1).astype(np.float32)
		mask = ~np.isfinite(arr)
		arr[mask] = np.nan
		# robust normalization
		vmin = np.nanpercentile(arr, 2)
		vmax = np.nanpercentile(arr, 98)
		if not np.isfinite(vmin) or not np.isfinite(vmax) or vmax <= vmin:
			vmin, vmax = np.nanmin(arr), np.nanmax(arr)
			if not np.isfinite(vmin) or not np.isfinite(vmax) or vmax <= vmin:
				vmin, vmax = 0.0, 1.0
		norm = (arr - vmin) / (vmax - vmin + 1e-9)
		norm = np.clip(norm, 0, 1)
		if mode == "gray":
			img = (norm * 255).astype(np.uint8)
			cv2.imwrite(dst_path, img)
		else:
			# apply OpenCV colormap
			img = (norm * 255).astype(np.uint8)
			img = cv2.applyColorMap(img, getattr(cv2, mode, cv2.COLORMAP_VIRIDIS))
			cv2.imwrite(dst_path, img)
	print(f"Saved {dst_path}")


def main(out_dir: str):
	layers = [
		("hillshade.tif", "hillshade.png", "gray"),
		("slope_deg.tif", "slope_deg.png", "COLORMAP_INFERNO"),
		("twi.tif", "twi.png", "COLORMAP_PLASMA"),
		("relief.tif", "relief.png", "COLORMAP_TURBO"),
		("roughness_TRI.tif", "roughness_TRI.png", "COLORMAP_VIRIDIS"),
	]
	for src, dst, mode in layers:
		src_path = os.path.join(out_dir, src)
		dst_path = os.path.join(out_dir, dst)
		if os.path.exists(src_path):
			save_png(src_path, dst_path, mode)
		else:
			print(f"Skip {src} (not found)")


if __name__ == "__main__":
	p = argparse.ArgumentParser()
	p.add_argument("--dir", default=".", help="Directory containing GeoTIFF layers")
	args = p.parse_args()
	main(args.dir)
