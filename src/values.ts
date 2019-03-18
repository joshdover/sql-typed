export const addToValues = (values: any[], newValue: any) => {
  const valueIdx = `$${values.length + 1}`;
  return {
    valueIdx,
    values: [...values, newValue]
  };
}
