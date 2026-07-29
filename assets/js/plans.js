/* A&R Design Build — Home Plans catalogue filter.
   Reads plan data from the embedded JSON block (#plans-data), which the
   build script generates from data/plans.json — single source of truth. */
(function () {
  "use strict";

  var dataEl = document.getElementById("plans-data");
  var grid = document.getElementById("plans-grid");
  var countEl = document.getElementById("plans-count");
  var emptyEl = document.getElementById("plans-empty");
  if (!dataEl || !grid) { return; }

  var payload = JSON.parse(dataEl.textContent);
  var plans = payload.plans;
  var lineNames = payload.lineNames;
  var lineThumbs = payload.lineThumbs;

  var selLine = document.getElementById("filter-line");
  var selArea = document.getElementById("filter-area");
  var selBeds = document.getElementById("filter-beds");
  var selBaths = document.getElementById("filter-baths");
  var resetBtn = document.getElementById("filter-reset");

  /* A line page can lock the line filter via data-line on the grid */
  var lockedLine = grid.getAttribute("data-line") || "";
  if (lockedLine && selLine) { selLine.value = lockedLine; selLine.disabled = true; }

  var AREA_RANGES = {
    "under-1500": function (a) { return a < 1500; },
    "1500-2500": function (a) { return a >= 1500 && a <= 2500; },
    "2500-3500": function (a) { return a > 2500 && a <= 3500; },
    "over-3500": function (a) { return a > 3500; }
  };

  function fmt(n) { return n.toLocaleString("en-CA"); }

  function cardHTML(p) {
    var badge = p.isModelHome
      ? '<span class="badge">&#9733; Model Home</span>'
      : "";
    var thumb = p.img
      ? '<img src="' + p.img + '" alt="' + p.name + ' — exterior rendering" loading="lazy">'
      : lineThumbs[p.line];
    return (
      '<article class="card plan-card reveal is-visible">' +
        '<div class="ph" aria-hidden="true">' + thumb + "</div>" +
        '<div class="card__body">' +
          '<span class="plan-card__line">' + lineNames[p.line] + "</span>" +
          '<h3><a href="' + p.url + '">' + p.name + "</a>" + badge + "</h3>" +
          '<ul class="plan-card__specs">' +
            "<li><strong>" + p.bedrooms + "</strong> bed</li>" +
            "<li><strong>" + p.bathrooms + "</strong> bath</li>" +
            "<li><strong>" + fmt(p.livingAreaSqFt) + "</strong> sq ft</li>" +
          "</ul>" +
          '<span class="card__link">View plan &rarr;</span>' +
        "</div>" +
      "</article>"
    );
  }

  function apply() {
    var line = lockedLine || (selLine ? selLine.value : "");
    var area = selArea ? selArea.value : "";
    var beds = selBeds ? parseInt(selBeds.value, 10) : NaN;
    var baths = selBaths ? parseFloat(selBaths.value) : NaN;

    var filtered = plans.filter(function (p) {
      if (line && p.line !== line) { return false; }
      if (area && AREA_RANGES[area] && !AREA_RANGES[area](p.livingAreaSqFt)) { return false; }
      if (!isNaN(beds) && p.bedrooms < beds) { return false; }
      if (!isNaN(baths) && p.bathrooms < baths) { return false; }
      return true;
    });

    grid.innerHTML = filtered.map(cardHTML).join("");
    if (countEl) {
      countEl.textContent = filtered.length === 1
        ? "Showing 1 plan"
        : "Showing " + filtered.length + " plans";
    }
    if (emptyEl) { emptyEl.hidden = filtered.length !== 0; }
  }

  [selLine, selArea, selBeds, selBaths].forEach(function (sel) {
    if (sel) { sel.addEventListener("change", apply); }
  });
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      [selLine, selArea, selBeds, selBaths].forEach(function (sel) {
        if (sel && !sel.disabled) { sel.value = ""; }
      });
      apply();
    });
  }

  apply();
})();
