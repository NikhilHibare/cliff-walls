export function computeShadowInterval({
  actorEyeHeight,
  wallTop,
  wallBottom,
  distance,
}) {
  if (distance <= 0) return null;

  const topAngle = Math.atan((wallTop - actorEyeHeight) / distance);
  const bottomAngle = Math.atan((wallBottom - actorEyeHeight) / distance);

  if (wallBottom >= actorEyeHeight) return null;

  return {
    start: Math.min(topAngle, bottomAngle),
    end: Math.max(topAngle, bottomAngle),
  };
}
