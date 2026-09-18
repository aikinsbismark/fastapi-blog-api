export function showView(viewName) {
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(`view-${viewName}`)?.classList.add("active");

  document.querySelectorAll(".nav-item[data-view]").forEach((navItem) => {
    navItem.classList.toggle("active", navItem.dataset.view === viewName);
  });
}