export function blocksVisionByHeight({
  actorEyeHeight,
  wallTopHeight,
  distanceToWall,
}) {
  if (distanceToWall <= 0) return false;

 
  const angle = Math.atan(wallTopHeight / distanceToWall);

 
  const projectedHeight = Math.tan(angle) * distanceToWall;

  return projectedHeight > actorEyeHeight;
}
