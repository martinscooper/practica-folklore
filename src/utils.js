export const repeat = (arr, times) => {
  return new Array(times + 1).fill(null).map(() => [...arr]);
};

export const formatChacareraOption = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
};
