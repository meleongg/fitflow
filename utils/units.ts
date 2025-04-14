export const kgToLbs = (kg: number): number => {
  return kg * 2.20462;
};

export const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462;
};

// Format weight with the correct unit
export const formatWeight = (weight: number, useMetric: boolean): string => {
  if (useMetric) {
    return `${weight.toFixed(1)} kg`;
  } else {
    return `${kgToLbs(weight).toFixed(1)} lbs`;
  }
};

// Convert input weight to storage format (kg)
export const convertToStorageUnit = (
  weight: number,
  isInMetric: boolean
): number => {
  return isInMetric ? weight : lbsToKg(weight);
};

// Convert storage weight (kg) back to display unit
export const convertFromStorageUnit = (
  weight: number,
  isInMetric: boolean
): number => {
  return isInMetric ? weight : kgToLbs(weight);
};

/**
 * Displays weight with proper units
 * @param weight Weight value from database (in kg)
 * @param useMetric Whether to display in metric or imperial
 * @param includeUnit Whether to include the unit label (kg/lbs)
 * @returns Formatted weight string
 */
export const displayWeight = (
  weight: number,
  useMetric: boolean,
  includeUnit: boolean = true
): string => {
  // Make sure weight is a number
  const numWeight = Number(weight);

  // Check if it's a valid number
  if (isNaN(numWeight) || numWeight === 0) return "-";

  // Convert the weight if necessary - assumes DB stores in kg
  const convertedWeight = useMetric ? numWeight : numWeight * 2.20462;

  // Format with 1 decimal place
  const formattedWeight = parseFloat(convertedWeight.toFixed(1));

  // Return with or without unit
  return includeUnit
    ? `${formattedWeight} ${useMetric ? "kg" : "lbs"}`
    : String(formattedWeight);
};
