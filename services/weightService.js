export function calculateNetWeight(grossWeight, stoneWeight) {
  const g = parseFloat(grossWeight) || 0;
  const s = parseFloat(stoneWeight) || 0;
  const net = Math.max(0, g - s);
  return parseFloat(net.toFixed(3));
}
