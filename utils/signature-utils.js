module.exports = {
  CalculateZoom,
  CalculateOrientation,
}

function CalculateZoom(userZoom, pageWidth, imageWidth) {
  const imageBiggerFactor = imageWidth / pageWidth;
  const realZoom = userZoom / imageBiggerFactor;
  return realZoom;
}

function CalculateOrientation(isUsingBottom, isUsingLeft, moveL, moveR, moveT, moveB) {
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
  if (isUsingBottom && isUsingRight) {
    return {
      isUsingTop,
      isUsingLeft,
      gravity: 'southeast',
      y: moveB,
      x: moveR,
    }
  }
}