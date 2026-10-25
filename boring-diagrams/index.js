// Keep previously shared collection fragment URLs useful after the move to real pages.
// Resolve only build-authored links; unknown fragments (including #method) stay on the index.
const legacyId = location.hash.slice(1)
const destination = [...document.querySelectorAll('a[data-exhibit]')].find(link => link.dataset.exhibit === legacyId)
if (destination) location.replace(destination.href)
