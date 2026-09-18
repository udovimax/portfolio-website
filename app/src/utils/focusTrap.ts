export function getFocusLoopTarget(
  activeElement: HTMLElement | null,
  focusableElements: readonly HTMLElement[],
  reverse: boolean,
) {
  if (!focusableElements.length) {
    return null
  }

  const currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1
  if (currentIndex === -1) {
    return reverse ? focusableElements[focusableElements.length - 1] : focusableElements[0]
  }

  if (reverse) {
    return focusableElements[currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1]
  }

  return focusableElements[currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1]
}
