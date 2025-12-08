import torch
import numpy as np
import cv2
from PIL import Image


def load_model(model_name: str = "MiDaS_small"):
	# Choices: DPT_Large, DPT_Hybrid, MiDaS_small
	model = torch.hub.load("intel-isl/MiDaS", model_name)
	model.eval()
	device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
	model.to(device)
	transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
	if model_name.startswith("DPT"):
		transform = transforms.dpt_transform
		input_mode = "pil"
	else:
		transform = transforms.small_transform
		input_mode = "np_rgb"
	return model, transform, device, input_mode


def infer_depth(input_path: str, out_path: str = "dem_uint16.tif", model_name: str = "MiDaS_small"):
	model, transform, device, input_mode = load_model(model_name)
	if input_mode == "np_rgb":
		# Read as RGB NumPy array
		img_bgr = cv2.imread(input_path, cv2.IMREAD_COLOR)
		if img_bgr is None:
			raise FileNotFoundError(f"Cannot read image: {input_path}")
		img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
		tr_out = transform(img)
		inp = tr_out["image"] if isinstance(tr_out, dict) else tr_out
		out_h, out_w = img.shape[0], img.shape[1]
	else:
		pil_img = Image.open(input_path).convert("RGB")
		tr_out = transform(pil_img)
		inp = tr_out["image"] if isinstance(tr_out, dict) else tr_out
		# PIL size -> (w, h)
		out_h, out_w = pil_img.size[1], pil_img.size[0]

	inp = inp.to(device)
	# Ensure batch dimension exactly once
	if inp.dim() == 3:
		batch = inp.unsqueeze(0)
	elif inp.dim() == 4:
		batch = inp
	else:
		raise RuntimeError(f"Unexpected input tensor shape: {tuple(inp.shape)}")

	with torch.no_grad():
		pred = model(batch)
		# pred expected shape: [B, H, W] or [B, 1, H, W]; normalize to [B, 1, H, W]
		if pred.dim() == 3:
			pred = pred.unsqueeze(1)
		elif pred.dim() == 4 and pred.shape[1] != 1:
			pred = pred[:, :1, ...]

		depth = torch.nn.functional.interpolate(
			pred,
			size=(out_h, out_w),
			mode="bicubic",
			align_corners=False,
		).squeeze().cpu().numpy()

	# Normalize inverse-depth-like output to elevation-like values
	depth_norm = (depth - depth.min()) / (depth.max() - depth.min() + 1e-9)
	elev = 1.0 - depth_norm
	elev_u16 = (elev * 65535).astype(np.uint16)
	cv2.imwrite(out_path, elev_u16)
	print(f"Saved {out_path}")


if __name__ == "__main__":
	import argparse
	p = argparse.ArgumentParser()
	p.add_argument("--input", required=True, help="Path to input image (jpg/png)")
	p.add_argument("--output", default="dem_uint16.tif", help="Output uint16 TIFF path")
	p.add_argument("--model", default="MiDaS_small", help="Depth model: MiDaS_small | DPT_Large | DPT_Hybrid")
	args = p.parse_args()
	infer_depth(args.input, args.output, args.model)
