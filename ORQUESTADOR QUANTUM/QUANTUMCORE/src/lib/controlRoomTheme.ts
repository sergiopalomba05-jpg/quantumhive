export interface PointerPosition {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizePointerPosition(
  clientX: number,
  clientY: number,
  width: number,
  height: number
): PointerPosition {
  if (width <= 0 || height <= 0) {
    return { x: 50, y: 50 };
  }

  return {
    x: clamp((clientX / width) * 100, 0, 100),
    y: clamp((clientY / height) * 100, 0, 100),
  };
}

export function createControlRoomStyle(position: PointerPosition): Record<string, string> {
  return {
    '--qh-pointer-x': `${position.x}%`,
    '--qh-pointer-y': `${position.y}%`,
  };
}
