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

// In your utils/units.ts file
export const displayWeight = (weight: number, useMetric: boolean): string => {
  const value = useMetric ? weight : kgToLbs(weight);
  const unit = useMetric ? "kg" : "lbs";

  // For volumes, round to whole numbers
  const isLargeNumber = value >= 100;
  const decimals = isLargeNumber ? 0 : 1;

  return `${value.toFixed(decimals)} ${unit}`;
};
