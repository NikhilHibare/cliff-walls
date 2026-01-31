export function computeShadowInterval({
  actorEyeHeight,
  wallTop,
  wallBottom,
  distance,
}) {
  if (distance <= 0) return null;

  // 🔴 FULL BLOCK RULES
  if (actorEyeHeight <= wallTop) return null;
  if (actorEyeHeight <= wallBottom) return null;

  // Height differences
  const topDelta = wallTop - actorEyeHeight;
  const bottomDelta = wallBottom - actorEyeHeight;

  // Convert to angles (shadow cone)
  const start = Math.atan(bottomDelta / distance);
  const end = Math.atan(topDelta / distance);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}
