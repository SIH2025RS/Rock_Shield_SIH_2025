import rasterio
from rasterio.transform import from_origin
import cv2


def write_dem(in_path: str, out_path: str = "dem.tif"):
	arr = cv2.imread(in_path, cv2.IMREAD_UNCHANGED)
	h, w = arr.shape
	transform = from_origin(0, 0, 1.0, 1.0)  # pixel size 1, origin 0,0
	with rasterio.open(
		out_path,
		"w",
		driver="GTiff",
		height=h,
		width=w,
		count=1,
		dtype=arr.dtype,
		transform=transform,
		crs=None,
	) as dst:
		dst.write(arr, 1)
	print(f"Saved {out_path}")


if __name__ == "__main__":
	import argparse
	p = argparse.ArgumentParser()
	p.add_argument("--input", default="dem_uint16.tif")
	p.add_argument("--output", default="dem.tif")
	args = p.parse_args()
	write_dem(args.input, args.output)
