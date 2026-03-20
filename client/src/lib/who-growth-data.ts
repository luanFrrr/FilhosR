type PercentileRow = {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

const HEAD_CIRCUMFERENCE_BOYS: PercentileRow[] = [
  { month: 0, p3: 32.1, p15: 33.1, p50: 34.5, p85: 35.8, p97: 36.9 },
  { month: 1, p3: 35.1, p15: 36.1, p50: 37.3, p85: 38.5, p97: 39.5 },
  { month: 2, p3: 36.9, p15: 37.9, p50: 39.1, p85: 40.3, p97: 41.3 },
  { month: 3, p3: 38.3, p15: 39.3, p50: 40.5, p85: 41.7, p97: 42.7 },
  { month: 4, p3: 39.4, p15: 40.4, p50: 41.6, p85: 42.9, p97: 43.9 },
  { month: 5, p3: 40.3, p15: 41.3, p50: 42.6, p85: 43.8, p97: 44.8 },
  { month: 6, p3: 41.0, p15: 42.1, p50: 43.3, p85: 44.6, p97: 45.6 },
  { month: 7, p3: 41.7, p15: 42.7, p50: 44.0, p85: 45.3, p97: 46.3 },
  { month: 8, p3: 42.2, p15: 43.2, p50: 44.5, p85: 45.8, p97: 46.9 },
  { month: 9, p3: 42.6, p15: 43.7, p50: 45.0, p85: 46.3, p97: 47.4 },
  { month: 10, p3: 43.0, p15: 44.1, p50: 45.4, p85: 46.7, p97: 47.8 },
  { month: 11, p3: 43.4, p15: 44.4, p50: 45.8, p85: 47.1, p97: 48.2 },
  { month: 12, p3: 43.6, p15: 44.7, p50: 46.1, p85: 47.4, p97: 48.5 },
  { month: 13, p3: 43.9, p15: 45.0, p50: 46.3, p85: 47.7, p97: 48.8 },
  { month: 14, p3: 44.1, p15: 45.2, p50: 46.6, p85: 47.9, p97: 49.0 },
  { month: 15, p3: 44.3, p15: 45.5, p50: 46.8, p85: 48.2, p97: 49.3 },
  { month: 16, p3: 44.5, p15: 45.6, p50: 47.0, p85: 48.4, p97: 49.5 },
  { month: 17, p3: 44.7, p15: 45.8, p50: 47.2, p85: 48.6, p97: 49.7 },
  { month: 18, p3: 44.9, p15: 46.0, p50: 47.4, p85: 48.7, p97: 49.9 },
  { month: 19, p3: 45.0, p15: 46.2, p50: 47.5, p85: 48.9, p97: 50.0 },
  { month: 20, p3: 45.2, p15: 46.3, p50: 47.7, p85: 49.1, p97: 50.2 },
  { month: 21, p3: 45.3, p15: 46.4, p50: 47.8, p85: 49.2, p97: 50.4 },
  { month: 22, p3: 45.4, p15: 46.6, p50: 48.0, p85: 49.4, p97: 50.5 },
  { month: 23, p3: 45.6, p15: 46.7, p50: 48.1, p85: 49.5, p97: 50.7 },
  { month: 24, p3: 45.7, p15: 46.8, p50: 48.3, p85: 49.7, p97: 50.8 },
];

const HEAD_CIRCUMFERENCE_GIRLS: PercentileRow[] = [
  { month: 0, p3: 31.7, p15: 32.7, p50: 33.9, p85: 35.1, p97: 36.1 },
  { month: 1, p3: 34.3, p15: 35.3, p50: 36.5, p85: 37.8, p97: 38.8 },
  { month: 2, p3: 36.0, p15: 37.0, p50: 38.3, p85: 39.5, p97: 40.5 },
  { month: 3, p3: 37.2, p15: 38.2, p50: 39.5, p85: 40.8, p97: 41.9 },
  { month: 4, p3: 38.2, p15: 39.3, p50: 40.6, p85: 41.9, p97: 43.0 },
  { month: 5, p3: 39.0, p15: 40.1, p50: 41.5, p85: 42.8, p97: 43.9 },
  { month: 6, p3: 39.7, p15: 40.8, p50: 42.2, p85: 43.5, p97: 44.6 },
  { month: 7, p3: 40.4, p15: 41.5, p50: 42.8, p85: 44.2, p97: 45.3 },
  { month: 8, p3: 40.9, p15: 42.0, p50: 43.4, p85: 44.7, p97: 45.9 },
  { month: 9, p3: 41.3, p15: 42.4, p50: 43.8, p85: 45.2, p97: 46.3 },
  { month: 10, p3: 41.7, p15: 42.8, p50: 44.2, p85: 45.6, p97: 46.8 },
  { month: 11, p3: 42.0, p15: 43.2, p50: 44.6, p85: 46.0, p97: 47.1 },
  { month: 12, p3: 42.3, p15: 43.5, p50: 44.9, p85: 46.3, p97: 47.5 },
  { month: 13, p3: 42.6, p15: 43.8, p50: 45.2, p85: 46.6, p97: 47.7 },
  { month: 14, p3: 42.9, p15: 44.0, p50: 45.4, p85: 46.8, p97: 48.0 },
  { month: 15, p3: 43.1, p15: 44.2, p50: 45.7, p85: 47.1, p97: 48.2 },
  { month: 16, p3: 43.3, p15: 44.4, p50: 45.9, p85: 47.3, p97: 48.5 },
  { month: 17, p3: 43.5, p15: 44.6, p50: 46.1, p85: 47.5, p97: 48.7 },
  { month: 18, p3: 43.6, p15: 44.8, p50: 46.2, p85: 47.7, p97: 48.8 },
  { month: 19, p3: 43.8, p15: 45.0, p50: 46.4, p85: 47.8, p97: 49.0 },
  { month: 20, p3: 44.0, p15: 45.1, p50: 46.6, p85: 48.0, p97: 49.2 },
  { month: 21, p3: 44.1, p15: 45.3, p50: 46.7, p85: 48.2, p97: 49.4 },
  { month: 22, p3: 44.3, p15: 45.4, p50: 46.9, p85: 48.3, p97: 49.5 },
  { month: 23, p3: 44.4, p15: 45.6, p50: 47.0, p85: 48.5, p97: 49.7 },
  { month: 24, p3: 44.6, p15: 45.7, p50: 47.2, p85: 48.6, p97: 49.8 },
];

const WEIGHT_BOYS: PercentileRow[] = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { month: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { month: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { month: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { month: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.3 },
  { month: 8, p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 },
  { month: 9, p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { month: 10, p3: 7.4, p15: 8.1, p50: 9.2, p85: 10.2, p97: 11.4 },
  { month: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 },
  { month: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { month: 13, p3: 7.9, p15: 8.8, p50: 9.9, p85: 11.0, p97: 12.3 },
  { month: 14, p3: 8.1, p15: 9.0, p50: 10.1, p85: 11.3, p97: 12.6 },
  { month: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { month: 16, p3: 8.4, p15: 9.4, p50: 10.5, p85: 11.7, p97: 13.1 },
  { month: 17, p3: 8.6, p15: 9.6, p50: 10.7, p85: 12.0, p97: 13.4 },
  { month: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
  { month: 19, p3: 8.9, p15: 10.0, p50: 11.1, p85: 12.5, p97: 13.9 },
  { month: 20, p3: 9.1, p15: 10.1, p50: 11.3, p85: 12.7, p97: 14.2 },
  { month: 21, p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { month: 22, p3: 9.4, p15: 10.5, p50: 11.8, p85: 13.2, p97: 14.7 },
  { month: 23, p3: 9.5, p15: 10.7, p50: 12.0, p85: 13.4, p97: 15.0 },
  { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
  { month: 27, p3: 10.2, p15: 11.3, p50: 12.7, p85: 14.2, p97: 16.0 },
  { month: 30, p3: 10.7, p15: 11.8, p50: 13.3, p85: 14.9, p97: 16.7 },
  { month: 33, p3: 11.1, p15: 12.3, p50: 13.8, p85: 15.5, p97: 17.4 },
  { month: 36, p3: 11.5, p15: 12.7, p50: 14.3, p85: 16.1, p97: 18.1 },
  { month: 39, p3: 11.9, p15: 13.1, p50: 14.8, p85: 16.7, p97: 18.8 },
  { month: 42, p3: 12.3, p15: 13.6, p50: 15.3, p85: 17.2, p97: 19.4 },
  { month: 45, p3: 12.7, p15: 14.0, p50: 15.8, p85: 17.8, p97: 20.1 },
  { month: 48, p3: 13.0, p15: 14.4, p50: 16.3, p85: 18.4, p97: 20.8 },
  { month: 51, p3: 13.4, p15: 14.9, p50: 16.8, p85: 19.0, p97: 21.5 },
  { month: 54, p3: 13.7, p15: 15.3, p50: 17.3, p85: 19.6, p97: 22.2 },
  { month: 57, p3: 14.1, p15: 15.7, p50: 17.8, p85: 20.2, p97: 22.9 },
  { month: 60, p3: 14.4, p15: 16.1, p50: 18.3, p85: 20.8, p97: 23.6 },
];

const WEIGHT_GIRLS: PercentileRow[] = [
  { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { month: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
  { month: 3, p3: 4.5, p15: 5.1, p50: 5.8, p85: 6.6, p97: 7.5 },
  { month: 4, p3: 5.0, p15: 5.6, p50: 6.4, p85: 7.3, p97: 8.2 },
  { month: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
  { month: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
  { month: 7, p3: 6.0, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.8 },
  { month: 8, p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.2 },
  { month: 9, p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 },
  { month: 10, p3: 6.7, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.9 },
  { month: 11, p3: 6.9, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.2 },
  { month: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
  { month: 13, p3: 7.2, p15: 8.1, p50: 9.2, p85: 10.4, p97: 11.8 },
  { month: 14, p3: 7.4, p15: 8.3, p50: 9.4, p85: 10.6, p97: 12.1 },
  { month: 15, p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 },
  { month: 16, p3: 7.7, p15: 8.7, p50: 9.8, p85: 11.1, p97: 12.6 },
  { month: 17, p3: 7.9, p15: 8.9, p50: 10.0, p85: 11.4, p97: 12.9 },
  { month: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 },
  { month: 19, p3: 8.2, p15: 9.2, p50: 10.4, p85: 11.8, p97: 13.5 },
  { month: 20, p3: 8.4, p15: 9.4, p50: 10.6, p85: 12.1, p97: 13.7 },
  { month: 21, p3: 8.6, p15: 9.6, p50: 10.9, p85: 12.3, p97: 14.0 },
  { month: 22, p3: 8.7, p15: 9.8, p50: 11.1, p85: 12.5, p97: 14.3 },
  { month: 23, p3: 8.9, p15: 10.0, p50: 11.3, p85: 12.8, p97: 14.6 },
  { month: 24, p3: 9.0, p15: 10.2, p50: 11.5, p85: 13.0, p97: 14.8 },
  { month: 27, p3: 9.5, p15: 10.7, p50: 12.1, p85: 13.7, p97: 15.7 },
  { month: 30, p3: 10.0, p15: 11.2, p50: 12.7, p85: 14.4, p97: 16.5 },
  { month: 33, p3: 10.4, p15: 11.7, p50: 13.3, p85: 15.1, p97: 17.3 },
  { month: 36, p3: 10.8, p15: 12.2, p50: 13.9, p85: 15.8, p97: 18.1 },
  { month: 39, p3: 11.2, p15: 12.7, p50: 14.4, p85: 16.5, p97: 18.9 },
  { month: 42, p3: 11.6, p15: 13.1, p50: 15.0, p85: 17.1, p97: 19.7 },
  { month: 45, p3: 12.0, p15: 13.6, p50: 15.5, p85: 17.8, p97: 20.5 },
  { month: 48, p3: 12.3, p15: 14.0, p50: 16.1, p85: 18.5, p97: 21.3 },
  { month: 51, p3: 12.7, p15: 14.5, p50: 16.6, p85: 19.1, p97: 22.1 },
  { month: 54, p3: 13.0, p15: 14.9, p50: 17.2, p85: 19.8, p97: 22.9 },
  { month: 57, p3: 13.4, p15: 15.3, p50: 17.7, p85: 20.5, p97: 23.7 },
  { month: 60, p3: 13.7, p15: 15.8, p50: 18.2, p85: 21.2, p97: 24.6 },
];

const HEIGHT_BOYS: PercentileRow[] = [
  { month: 0, p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 },
  { month: 1, p3: 51.1, p15: 52.7, p50: 54.7, p85: 56.7, p97: 58.4 },
  { month: 2, p3: 54.7, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.2 },
  { month: 3, p3: 57.6, p15: 59.3, p50: 61.4, p85: 63.5, p97: 65.3 },
  { month: 4, p3: 59.9, p15: 61.7, p50: 63.9, p85: 66.0, p97: 67.8 },
  { month: 5, p3: 61.8, p15: 63.6, p50: 65.9, p85: 68.1, p97: 70.0 },
  { month: 6, p3: 63.3, p15: 65.1, p50: 67.6, p85: 69.8, p97: 71.6 },
  { month: 7, p3: 64.8, p15: 66.7, p50: 69.2, p85: 71.3, p97: 73.2 },
  { month: 8, p3: 66.2, p15: 68.0, p50: 70.6, p85: 72.8, p97: 74.7 },
  { month: 9, p3: 67.5, p15: 69.4, p50: 72.0, p85: 74.2, p97: 76.2 },
  { month: 10, p3: 68.7, p15: 70.6, p50: 73.3, p85: 75.6, p97: 77.6 },
  { month: 11, p3: 69.9, p15: 71.9, p50: 74.5, p85: 76.9, p97: 78.9 },
  { month: 12, p3: 71.0, p15: 73.0, p50: 75.7, p85: 78.1, p97: 80.2 },
  { month: 13, p3: 72.1, p15: 74.1, p50: 76.9, p85: 79.3, p97: 81.5 },
  { month: 14, p3: 73.1, p15: 75.2, p50: 78.0, p85: 80.5, p97: 82.7 },
  { month: 15, p3: 74.1, p15: 76.2, p50: 79.1, p85: 81.7, p97: 83.9 },
  { month: 16, p3: 75.0, p15: 77.2, p50: 80.2, p85: 82.8, p97: 85.1 },
  { month: 17, p3: 76.0, p15: 78.2, p50: 81.2, p85: 83.9, p97: 86.2 },
  { month: 18, p3: 76.9, p15: 79.1, p50: 82.3, p85: 85.0, p97: 87.3 },
  { month: 19, p3: 77.7, p15: 80.0, p50: 83.2, p85: 86.0, p97: 88.4 },
  { month: 20, p3: 78.6, p15: 80.9, p50: 84.2, p85: 87.0, p97: 89.5 },
  { month: 21, p3: 79.4, p15: 81.7, p50: 85.1, p85: 88.0, p97: 90.5 },
  { month: 22, p3: 80.2, p15: 82.5, p50: 86.0, p85: 89.0, p97: 91.5 },
  { month: 23, p3: 80.9, p15: 83.3, p50: 86.9, p85: 89.9, p97: 92.5 },
  { month: 24, p3: 81.7, p15: 84.1, p50: 87.8, p85: 90.9, p97: 93.5 },
  { month: 27, p3: 83.7, p15: 86.3, p50: 90.2, p85: 93.4, p97: 96.1 },
  { month: 30, p3: 85.7, p15: 88.4, p50: 92.4, p85: 95.7, p97: 98.5 },
  { month: 33, p3: 87.5, p15: 90.3, p50: 94.4, p85: 97.9, p97: 100.8 },
  { month: 36, p3: 89.2, p15: 92.1, p50: 96.3, p85: 99.9, p97: 102.9 },
  { month: 39, p3: 90.9, p15: 93.8, p50: 98.1, p85: 101.9, p97: 105.0 },
  { month: 42, p3: 92.4, p15: 95.5, p50: 99.9, p85: 103.8, p97: 106.9 },
  { month: 45, p3: 93.9, p15: 97.1, p50: 101.6, p85: 105.6, p97: 108.8 },
  { month: 48, p3: 95.4, p15: 98.6, p50: 103.3, p85: 107.4, p97: 110.7 },
  { month: 51, p3: 96.8, p15: 100.1, p50: 104.9, p85: 109.1, p97: 112.5 },
  { month: 54, p3: 98.1, p15: 101.6, p50: 106.5, p85: 110.8, p97: 114.2 },
  { month: 57, p3: 99.5, p15: 103.0, p50: 108.0, p85: 112.5, p97: 116.0 },
  { month: 60, p3: 100.7, p15: 104.4, p50: 109.6, p85: 114.1, p97: 117.6 },
];

const HEIGHT_GIRLS: PercentileRow[] = [
  { month: 0, p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
  { month: 1, p3: 50.0, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.4 },
  { month: 2, p3: 53.2, p15: 55.0, p50: 57.1, p85: 59.1, p97: 59.9 },
  { month: 3, p3: 55.8, p15: 57.5, p50: 59.8, p85: 62.0, p97: 63.8 },
  { month: 4, p3: 57.8, p15: 59.6, p50: 62.1, p85: 64.3, p97: 66.2 },
  { month: 5, p3: 59.6, p15: 61.4, p50: 64.0, p85: 66.2, p97: 68.2 },
  { month: 6, p3: 61.0, p15: 63.0, p50: 65.7, p85: 68.0, p97: 70.0 },
  { month: 7, p3: 62.5, p15: 64.4, p50: 67.3, p85: 69.6, p97: 71.6 },
  { month: 8, p3: 63.7, p15: 65.8, p50: 68.7, p85: 71.1, p97: 73.2 },
  { month: 9, p3: 65.0, p15: 67.0, p50: 70.1, p85: 72.6, p97: 74.7 },
  { month: 10, p3: 66.1, p15: 68.2, p50: 71.5, p85: 74.0, p97: 76.1 },
  { month: 11, p3: 67.3, p15: 69.4, p50: 72.8, p85: 75.3, p97: 77.5 },
  { month: 12, p3: 68.4, p15: 70.5, p50: 74.0, p85: 76.6, p97: 78.9 },
  { month: 13, p3: 69.5, p15: 71.6, p50: 75.2, p85: 77.8, p97: 80.2 },
  { month: 14, p3: 70.5, p15: 72.7, p50: 76.4, p85: 79.1, p97: 81.4 },
  { month: 15, p3: 71.6, p15: 73.7, p50: 77.5, p85: 80.2, p97: 82.7 },
  { month: 16, p3: 72.5, p15: 74.8, p50: 78.6, p85: 81.4, p97: 83.9 },
  { month: 17, p3: 73.5, p15: 75.8, p50: 79.7, p85: 82.5, p97: 85.0 },
  { month: 18, p3: 74.4, p15: 76.8, p50: 80.7, p85: 83.6, p97: 86.1 },
  { month: 19, p3: 75.3, p15: 77.7, p50: 81.7, p85: 84.7, p97: 87.3 },
  { month: 20, p3: 76.2, p15: 78.6, p50: 82.7, p85: 85.7, p97: 88.4 },
  { month: 21, p3: 77.0, p15: 79.5, p50: 83.7, p85: 86.7, p97: 89.4 },
  { month: 22, p3: 77.9, p15: 80.4, p50: 84.6, p85: 87.7, p97: 90.4 },
  { month: 23, p3: 78.7, p15: 81.2, p50: 85.5, p85: 88.7, p97: 91.4 },
  { month: 24, p3: 79.5, p15: 82.0, p50: 86.4, p85: 89.6, p97: 92.4 },
  { month: 27, p3: 81.6, p15: 84.3, p50: 88.9, p85: 92.2, p97: 95.1 },
  { month: 30, p3: 83.7, p15: 86.5, p50: 91.2, p85: 94.7, p97: 97.7 },
  { month: 33, p3: 85.6, p15: 88.5, p50: 93.4, p85: 97.0, p97: 100.1 },
  { month: 36, p3: 87.4, p15: 90.4, p50: 95.4, p85: 99.2, p97: 102.4 },
  { month: 39, p3: 89.2, p15: 92.3, p50: 97.4, p85: 101.3, p97: 104.6 },
  { month: 42, p3: 90.9, p15: 94.1, p50: 99.3, p85: 103.4, p97: 106.8 },
  { month: 45, p3: 92.5, p15: 95.8, p50: 101.1, p85: 105.4, p97: 108.9 },
  { month: 48, p3: 94.1, p15: 97.5, p50: 103.0, p85: 107.4, p97: 110.9 },
  { month: 51, p3: 95.6, p15: 99.1, p50: 104.7, p85: 109.3, p97: 112.9 },
  { month: 54, p3: 97.1, p15: 100.7, p50: 106.5, p85: 111.2, p97: 114.9 },
  { month: 57, p3: 98.5, p15: 102.2, p50: 108.2, p85: 113.0, p97: 116.8 },
  { month: 60, p3: 99.9, p15: 103.7, p50: 109.9, p85: 114.9, p97: 118.7 },
];

export type GrowthMetric = "weight" | "height" | "headCircumference";
export type Gender = "male" | "female";
export type GrowthAssessmentTone =
  | "critical-low"
  | "normal"
  | "critical-high";

export type GrowthAssessment = {
  metric: GrowthMetric;
  ageMonths: number;
  zone: string;
  tone: GrowthAssessmentTone;
  shortLabel: string;
  summary: string;
};

function getTable(metric: GrowthMetric, gender: Gender): PercentileRow[] {
  if (metric === "weight") return gender === "male" ? WEIGHT_BOYS : WEIGHT_GIRLS;
  if (metric === "height") return gender === "male" ? HEIGHT_BOYS : HEIGHT_GIRLS;
  return gender === "male"
    ? HEAD_CIRCUMFERENCE_BOYS
    : HEAD_CIRCUMFERENCE_GIRLS;
}

function interpolate(table: PercentileRow[], month: number, key: keyof Omit<PercentileRow, "month">): number {
  if (month <= table[0].month) return table[0][key];
  if (month >= table[table.length - 1].month) return table[table.length - 1][key];

  for (let i = 0; i < table.length - 1; i++) {
    if (month >= table[i].month && month <= table[i + 1].month) {
      const t = (month - table[i].month) / (table[i + 1].month - table[i].month);
      return table[i][key] + t * (table[i + 1][key] - table[i][key]);
    }
  }
  return table[table.length - 1][key];
}

export function getPercentileCurves(
  metric: GrowthMetric,
  gender: Gender,
  maxMonth: number,
): { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }[] {
  const table = getTable(metric, gender);
  const endMonth = Math.min(Math.max(maxMonth, 12), 60);
  const points: { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }[] = [];

  for (let m = 0; m <= endMonth; m++) {
    points.push({
      month: m,
      p3: Math.round(interpolate(table, m, "p3") * 10) / 10,
      p15: Math.round(interpolate(table, m, "p15") * 10) / 10,
      p50: Math.round(interpolate(table, m, "p50") * 10) / 10,
      p85: Math.round(interpolate(table, m, "p85") * 10) / 10,
      p97: Math.round(interpolate(table, m, "p97") * 10) / 10,
    });
  }

  return points;
}

export function getChildPercentileZone(
  value: number,
  ageMonths: number,
  metric: GrowthMetric,
  gender: Gender,
): string {
  if (metric === "headCircumference") {
    return "";
  }

  const table = getTable(metric, gender);
  const p3 = interpolate(table, ageMonths, "p3");
  const p15 = interpolate(table, ageMonths, "p15");
  const p50 = interpolate(table, ageMonths, "p50");
  const p85 = interpolate(table, ageMonths, "p85");
  const p97 = interpolate(table, ageMonths, "p97");

  if (value < p3) return "Abaixo da curva inferior";
  if (value < p15) return "Entre P3 e P15";
  if (value < p50) return "Entre P15 e P50";
  if (value < p85) return "Entre P50 e P85";
  if (value < p97) return "Entre P85 e P97";
  return "Acima da curva superior";
}

function preciseAgeMonths(birthDate: Date, recordDate: Date): number {
  const msDiff = recordDate.getTime() - birthDate.getTime();
  return Math.round((msDiff / (1000 * 60 * 60 * 24 * 30.4375)) * 10) / 10;
}

export function getGrowthAssessment(
  value: number,
  birthDate: string | Date,
  recordDate: string | Date,
  metric: GrowthMetric,
  gender: Gender,
): GrowthAssessment | null {
  const birth = new Date(birthDate);
  const record = new Date(recordDate);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(record.getTime())) {
    return null;
  }

  const ageMonths = preciseAgeMonths(birth, record);
  if (ageMonths < 0) {
    return null;
  }

  const maxSupportedAgeMonths = metric === "headCircumference" ? 24 : 60;
  if (ageMonths > maxSupportedAgeMonths) {
    return null;
  }

  const table = getTable(metric, gender);
  const p3 = interpolate(table, ageMonths, "p3");
  const p97 = interpolate(table, ageMonths, "p97");
  const metricLabel =
    metric === "weight"
      ? "peso"
      : metric === "height"
        ? "altura"
        : "perimetro cefalico";

  if (value < p3) {
    return {
      metric,
      ageMonths,
      zone: "Abaixo da faixa esperada",
      tone: "critical-low",
      shortLabel: "Abaixo da faixa esperada",
      summary: `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} abaixo da faixa de referência para a idade.`,
    };
  }

  if (value <= p97) {
    return {
      metric,
      ageMonths,
      zone: "Dentro da faixa esperada",
      tone: "normal",
      shortLabel: "Dentro da faixa esperada",
      summary: `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} dentro da faixa esperada para a idade.`,
    };
  }

  return {
    metric,
    ageMonths,
    zone: "Acima da faixa esperada",
    tone: "critical-high",
    shortLabel: "Acima da faixa esperada",
    summary: `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} acima da faixa de referência para a idade.`,
  };
}
