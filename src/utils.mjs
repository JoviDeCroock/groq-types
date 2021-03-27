export function inferDefaultExport(possibleDefault) {
  return possibleDefault.default ? possibleDefault.default : possibleDefault;
}