/**
 * Convert kilograms to pounds
 * @param kg Weight in kilograms
 * @returns Weight in pounds
 */
export const kgToLbs = (kg: number): number => {
  return kg * 2.20462;
};

/**
 * Convert pounds to kilograms
 * @param lbs Weight in pounds
 * @returns Weight in kilograms
 */
export const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462;
};

/**
 * Format weight with the correct unit
 * @param weight Weight value
 * @param useMetric Whether to use metric units
 * @returns Formatted weight string with units
 */
export const formatWeight = (weight: number, useMetric: boolean): string => {
  if (useMetric) {
    return `${weight.toFixed(1)} kg`;
  } else {
    return `${kgToLbs(weight).toFixed(1)} lbs`;
  }
};

/**
 * Convert input weight to storage format (kg)
 * @param weight Weight from user input
 * @param isInMetric Whether input is in metric units
 * @returns Weight in kilograms for storage
 */
export const convertToStorageUnit = (
  weight: number,
  isInMetric: boolean
): number => {
  if (!weight) return 0;
  return isInMetric ? Number(weight) : lbsToKg(Number(weight));
};

/**
 * Convert storage weight (kg) back to display unit
 * @param weight Weight from database (in kg)
 * @param isInMetric Whether to display in metric
 * @returns Weight in display units
 */
export const convertFromStorageUnit = (
  weight: number,
  isInMetric: boolean
): number => {
  if (!weight) return 0;
  return isInMetric ? Number(weight) : kgToLbs(Number(weight));
};

/**
 * Calculate volume consistently
 * @param weight Weight from database (in kg)
 * @param reps Number of repetitions
 * @param useMetric Whether to return in metric
 * @returns Volume in specified units
 */
export const calculateVolume = (
  weight: number,
  reps: number,
  useMetric: boolean
): number => {
  // Always calculate volume in storage units first (kg)
  const volumeInKg = Number(weight) * Number(reps);

  // Then convert if needed
  return useMetric ? volumeInKg : kgToLbs(volumeInKg);
};

/**
 * Displays weight with proper units and formatting
 * @param weight Weight value from database (in kg)
 * @param useMetric Whether to display in metric or imperial
 * @param includeUnit Whether to include the unit label (kg/lbs)
 * @param precision Number of decimal places (default: 1)
 * @returns Formatted weight string
 */
export const displayWeight = (
  weight: number,
  useMetric: boolean,
  includeUnit: boolean = true,
  precision: number = 1
): string => {
  // Make sure weight is a number
  const numWeight = Number(weight);

  // Check if it's a valid number
  if (isNaN(numWeight) || numWeight === 0) return "-";

  // Convert the weight if necessary - assumes DB stores in kg
  const convertedWeight = useMetric ? numWeight : kgToLbs(numWeight);

  // Format with specified precision
  const formattedWeight = parseFloat(convertedWeight.toFixed(precision));

  // Return with or without unit
  return includeUnit
    ? `${formattedWeight} ${useMetric ? "kg" : "lbs"}`
    : String(formattedWeight);
};
