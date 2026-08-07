const DECIMAL_PATTERN = /^\d+(\.\d{1,3})?$/;

export function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function parseWeight(value, fieldName, { required = true, greaterThanZero = false } = {}) {
  const raw = toTrimmedString(value);

  if (raw === undefined || raw === null || raw === "") {
    if (!required) return { value: 0, error: null };
    return { value: null, error: `${fieldName} is required.` };
  }

  const normalized = String(raw);
  if (!DECIMAL_PATTERN.test(normalized)) {
    return {
      value: null,
      error: `${fieldName} must be a non-negative decimal with no more than 3 decimal places.`,
    };
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    return { value: null, error: `${fieldName} must be a valid decimal number.` };
  }

  if (numericValue < 0) {
    return { value: null, error: `${fieldName} cannot be negative.` };
  }

  if (greaterThanZero && numericValue <= 0) {
    return { value: null, error: `${fieldName} must be greater than 0.` };
  }

  return { value: Number(numericValue.toFixed(3)), error: null };
}

export function calculateWeights(input) {
  const gross = parseWeight(
    input.grossWeight ?? input.gross_weight,
    "Gross Weight",
    { required: true, greaterThanZero: true }
  );
  const totalStone = parseWeight(
    input.totalStoneWeight ?? input.total_stone_weight ?? input.stoneWeight ?? input.stone_weight,
    "Total Stone Weight",
    { required: false }
  );
  const pearl = parseWeight(
    input.pearlWeight ?? input.pearl_weight,
    "Pearl Weight",
    { required: false }
  );

  const errors = [gross.error, totalStone.error, pearl.error].filter(Boolean);
  if (errors.length > 0) return { errors };

  if (pearl.value > totalStone.value) {
    errors.push("Pearl Weight cannot be greater than Total Stone Weight.");
  }

  if (gross.value < totalStone.value) {
    errors.push("Gross Weight cannot be less than Total Stone Weight.");
  }

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    weights: {
      gross_weight: gross.value,
      total_stone_weight: totalStone.value,
      stone_weight: totalStone.value,
      pearl_weight: pearl.value,
      ad_weight: Number((totalStone.value - pearl.value).toFixed(3)),
      net_weight: Number((gross.value - totalStone.value).toFixed(3)),
    },
  };
}

export function validateDispatchItems(items) {
  const errors = [];
  const validatedItems = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { errors: ["At least one ornament item is required."], items: [] };
  }

  items.forEach((item, index) => {
    const { errors: itemErrors, weights } = calculateWeights(item);

    if (itemErrors.length > 0) {
      itemErrors.forEach((error) => errors.push(`Item ${index + 1}: ${error}`));
      return;
    }

    validatedItems.push({
      item_number: item.itemNo || item.item_number || null,
      description: item.name || item.description || "Gold Ornament",
      ...weights,
    });
  });

  return { errors, items: validatedItems };
}

export function validateRole(role) {
  return ["ADMIN", "MANAGER", "SALESPERSON"].includes(role);
}

export function validateStatus(status) {
  return ["ACTIVE", "INACTIVE"].includes(status);
}
