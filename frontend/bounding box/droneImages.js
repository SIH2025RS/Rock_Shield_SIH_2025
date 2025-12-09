export const DRONE_IMAGE_BASE_URL = '/drone-images';

export const droneImageList = [
  "WhatsApp Image 2025-12-09 at 2.48.55 AM.jpeg",
  "WhatsApp Image 2025-12-09 at 2.48.56 AM (1).jpeg",
  "WhatsApp Image 2025-12-09 at 2.48.56 AM.jpeg",
  "WhatsApp Image 2025-12-09 at 2.48.57 AM.jpeg",
  "WhatsApp Image 2025-12-09 at 2.48.58 AM.jpeg",
  "WhatsApp Image 2025-12-09 at 2.48.59 AM (1).jpeg",
  "WhatsApp Image 2025-12-09 at 2.49.01 AM (1).jpeg",
];

export function getDroneImageUrl(name) {
  const base = DRONE_IMAGE_BASE_URL.endsWith('/') ? DRONE_IMAGE_BASE_URL : `${DRONE_IMAGE_BASE_URL}/`;
  return `${base}${name}`;
}
