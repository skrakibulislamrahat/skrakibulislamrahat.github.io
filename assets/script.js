(function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const btn = document.getElementById("navToggle");
  const list = document.getElementById("navList");

  if (btn && list) {
    btn.addEventListener("click", () => {
      const open = list.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close menu after clicking a link (mobile)
    list.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 820px)").matches) {
          list.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }
})();
