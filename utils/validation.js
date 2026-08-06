export function validatePositiveDecimal(val, name, required = true) {
  if (val === undefined || val === null || val === "") {
    if (required) return `${name} is required.`;
    return null;
  }
  const num = parseFloat(val);
  if (isNaN(num)) return `${name} must be a valid decimal number.`;
  if (num < 0) return `${name} cannot be negative.`;
  return null;
}

export function validateDispatchInput(body) {
  const errors = [];

  const grossErr = validatePositiveDecimal(body.gross_weight, "Gross Weight", true);
  if (grossErr) errors.push(grossErr);

  const grossNum = parseFloat(body.gross_weight);
  if (!isNaN(grossNum) && grossNum <= 0) {
    errors.push("Gross Weight must be greater than 0.");
  }

  const stoneErr = validatePositiveDecimal(body.stone_weight, "Stone Weight", false);
  if (stoneErr) errors.push(stoneErr);

  const pearlErr = validatePositiveDecimal(body.pearl_weight, "Pearl Weight", false);
  if (pearlErr) errors.push(pearlErr);

  return errors;
}
