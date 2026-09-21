export interface PriceStats {
  count: number;
  mean: number;
  median: number;
  weightedMean: number;
  weightedMedian: number;
  min: number;
  p25: number;
  p50: number;
  p75: number;
  max: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computePriceStats(
  values: { value: number; weight: number }[],
): PriceStats {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      weightedMean: 0,
      weightedMedian: 0,
      min: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      max: 0,
    };
  }

  const sortedValues = [...values].sort((a, b) => a.value - b.value);
  const nums = sortedValues.map((v) => v.value);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;

  const totalWeight = values.reduce((a, b) => a + b.weight, 0) || values.length;
  const weightedMean =
    values.reduce((a, b) => a + b.value * b.weight, 0) / totalWeight;

  // 가중 중앙값: 가중치 누적 50% 지점의 값
  let cumulative = 0;
  let weightedMedian = sortedValues[Math.floor(sortedValues.length / 2)].value;
  for (const item of sortedValues) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) {
      weightedMedian = item.value;
      break;
    }
  }

  return {
    count: nums.length,
    mean: Math.round(mean),
    median: Math.round(percentile(nums, 0.5)),
    weightedMean: Math.round(weightedMean),
    weightedMedian: Math.round(weightedMedian),
    min: nums[0],
    p25: Math.round(percentile(nums, 0.25)),
    p50: Math.round(percentile(nums, 0.5)),
    p75: Math.round(percentile(nums, 0.75)),
    max: nums[nums.length - 1],
  };
}

// IQR 기반 이상치 후보 탐지 (제거하지 않고 표시만 함, §29)
export function flagOutliers(values: number[]): boolean[] {
  if (values.length < 4) return values.map(() => false);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.map((v) => v < lower || v > upper);
}
