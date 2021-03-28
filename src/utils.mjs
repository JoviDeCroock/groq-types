export function inferDefaultExport(possibleDefault) {
  return possibleDefault.default ? possibleDefault.default : possibleDefault;
}

export function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}
