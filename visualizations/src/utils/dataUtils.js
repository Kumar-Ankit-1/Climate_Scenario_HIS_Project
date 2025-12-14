export function groupBy(arr, key) {
  return arr.reduce((acc, x) => {
    const k = x[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(x);
    return acc;
  }, {});
}
