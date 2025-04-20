const SERVICE = s_form.getValue("service");

// 1. Find the original button
const originalButton = document.querySelector('[data-test="reference-dependency-map-link-button"]');

if (originalButton) {
  // 2. Hide the original
  originalButton.style.display = 'none';

  // 3. Create a new button
  const newButton = originalButton.cloneNode(true);

  // 4. Set a new click behavior (for example, open a new URL)
  newButton.addEventListener('click', () => {
    // window.open(`/visual/dependency?sys_id=${SOURCE_CI}&essence=sys_cmdb_ci&script=CIClassBased`, '_blank');
    window.open(`/portal/visualization?sys_id=${SERVICE}`, '_blank');
  });

  // 5. Insert the new button into the DOM right after the original
  originalButton.parentNode.insertBefore(newButton, originalButton.nextSibling);

  newButton.style = '';
}
