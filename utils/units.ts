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

// In your utils/units.ts file
export const displayWeight = (weight: number, useMetric: boolean): string => {
  const value = useMetric ? weight : kgToLbs(weight);
  const unit = useMetric ? "kg" : "lbs";
  return `${value.toFixed(1)} ${unit}`;
};
