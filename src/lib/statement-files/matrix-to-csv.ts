export function matrixToCsvText(matrix: string[][]): string {
  return matrix
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? ""
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    )
    .join("\n")
}
