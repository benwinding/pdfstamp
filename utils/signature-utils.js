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
      gravity: 'NorthWest',
      y: moveT,
      x: moveL,
    }
  }
  if (isUsingTop && isUsingRight) {
    return {
      gravity: 'NorthEast',
      y: moveT,
      x: moveR,
    }
  }
  if (isUsingBottom && isUsingLeft) {
    return {
      gravity: 'SouthWest',
      y: moveB,
      x: moveL,
    }
  }
  if (isUsingBottom && isUsingRight) {
    return {
      gravity: 'SouthEast',
      y: moveB,
      x: moveR,
    }
  }
}