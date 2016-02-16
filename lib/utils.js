

export function getFunctionName (fn) {
  if (fn.name) {
    return fn.name;
  }

  return (fn.toString().trim().match(/^function\s*([^\s(]+)/) || [])[1];
}
