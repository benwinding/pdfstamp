export function CalculateZoom(userZoom: number, pageWidth: number, imageWidth: number) {
  const imageBiggerFactor = imageWidth / pageWidth;
  return userZoom / imageBiggerFactor;
}

export function CalculateOrientation(isUsingBottom: boolean, isUsingLeft: boolean, moveL: number, moveR: number, moveT: number, moveB: number): {
  isUsingTop: boolean,
  isUsingLeft: boolean,
  gravity: string,
  y: any,
  x: any,
} {
  const isUsingTop = !isUsingBottom;
  const isUsingRight = !isUsingLeft;
  if (isUsingTop && isUsingLeft) {
    return {
      isUsingTop,
      isUsingLeft,
      gravity: 'northwest',
      y: moveT,
      x: moveL,
    }
  }
  if (isUsingTop && isUsingRight) {
    return {
      isUsingTop,
      isUsingLeft,
      gravity: 'northeast',
      y: moveT,
      x: moveR,
    }
  }
  if (isUsingBottom && isUsingLeft) {
    return {
      isUsingTop,
      isUsingLeft,
      gravity: 'southwest',
      y: moveB,
      x: moveL,
    }
  }
  return {
    isUsingTop,
    isUsingLeft,
    gravity: 'southeast',
    y: moveB,
    x: moveR,
  }
}