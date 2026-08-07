export function calculateNetWeight(grossWeight, stoneWeight) {
  const g = parseFloat(grossWeight) || 0;
  const s = parseFloat(stoneWeight) || 0;
  const net = Math.max(0, g - s);
  return parseFloat(net.toFixed(3));
}

export function calculateAdWeight(totalStoneWeight, pearlWeight) {
  const s = parseFloat(totalStoneWeight) || 0;
  const p = parseFloat(pearlWeight) || 0;
  return parseFloat(Math.max(0, s - p).toFixed(3));
}
