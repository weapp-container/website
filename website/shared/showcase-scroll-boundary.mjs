// Browser scrolling belongs to the host screen even while guest input is
// fenced. Wheel events cross browsing-context boundaries through the browser's
// default scroll chain, not through DOM bubbling, so each document owns a guard.
export function attachShowcaseScrollBoundary(root, {nativeScroll = ''} = {}) {
  const nativeCanScroll = event => {
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const boundary = nativeScroll && target?.closest(nativeScroll);
    if (!boundary || !root.contains(boundary)) return false;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (!Number.isFinite(delta) || delta === 0) return false;
    for (let element = target; element; element = element.parentElement) {
      const style = element.ownerDocument.defaultView.getComputedStyle(element);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const offset = horizontal ? element.scrollLeft : element.scrollTop;
      const maximum = horizontal ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
      if (/^(auto|scroll|overlay)$/.test(overflow) && maximum > 0
        && (delta < 0 ? offset > 0 : offset < maximum - 1)) return true;
      if (element === boundary) break;
    }
    return false;
  };
  const wheel = event => {
    // Preserve browser zoom and any cancellation already chosen by the guest.
    if (event.ctrlKey || event.defaultPrevented || !event.cancelable || nativeCanScroll(event)) return;
    event.preventDefault();
  };
  const options = {passive: false};
  root.addEventListener('wheel', wheel, options);
  let attached = true;
  return () => {
    if (!attached) return;
    attached = false;
    root.removeEventListener('wheel', wheel, options);
  };
}
