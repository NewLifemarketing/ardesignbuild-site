/* A&R Design Build — global behaviour */
(function () {
  "use strict";

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Nav dropdowns: caret buttons toggle submenus (mobile tap + assistive tech).
     Desktop hover/focus reveal is pure CSS; clicking the parent link navigates. */
  document.querySelectorAll(".nav-item .dropdown-caret").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".nav-item");
      var open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      /* Only one submenu open at a time */
      if (open) {
        document.querySelectorAll(".nav-item.is-open").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            var c = other.querySelector(".dropdown-caret");
            if (c) { c.setAttribute("aria-expanded", "false"); }
          }
        });
      }
    });
  });

  /* Scroll-reveal micro-interaction */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Quote form: prefill plan of interest from ?plan= or data attribute */
  var planField = document.getElementById("field-plan");
  if (planField) {
    var params = new URLSearchParams(window.location.search);
    var plan = params.get("plan") || planField.getAttribute("data-prefill") || "";
    if (plan) { planField.value = plan; }
  }

  /* Quote form: validation + honeypot, then an honest EMAIL HAND-OFF.
     GitHub Pages is static, so there's no server to receive a POST. On a valid
     submit we open the visitor's mail app with their details pre-filled to
     laura@arcarpentry.com — a real message, not a faked "received" state.
     TO UPGRADE LATER: point form.action at a backend (Formspree / GoHighLevel)
     and replace the mailto block with a fetch()/native submit. */
  var LEADS_EMAIL = "laura@arcarpentry.com";
  var FIELD_LABELS = {
    name: "Name", first_name: "First name", last_name: "Last name", email: "Email",
    phone: "Phone", town: "Location / Town", build_type: "Build type",
    plan: "Plan of interest", lot_status: "Lot status", timeline: "Timeline",
    budget: "Budget range", message: "Message"
  };
  document.querySelectorAll("form[data-quote-form]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      /* Honeypot: silently drop bot submissions */
      var hp = form.querySelector("[name='company_website']");
      if (hp && hp.value) { return; }

      var valid = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".form-field");
        var ok = input.checkValidity();
        if (field) { field.classList.toggle("has-error", !ok); }
        if (!ok) { valid = false; }
      });
      if (!valid) {
        var firstErr = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (firstErr) { firstErr.focus(); }
        return;
      }

      /* Build a pre-filled email from the form fields */
      var lines = [];
      form.querySelectorAll("input, select, textarea").forEach(function (el) {
        if (!el.name || el.name === "company_website" || !el.value) { return; }
        lines.push((FIELD_LABELS[el.name] || el.name) + ": " + el.value);
      });
      var planEl = form.querySelector("[name='plan']");
      var subject = form.id === "download-form"
        ? "Plan catalogue request — A&R Design Build"
        : (planEl && planEl.value ? "Quote request: " + planEl.value
                                  : "Website enquiry — A&R Design Build");
      var mailto = "mailto:" + LEADS_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mailto;

      /* Honest confirmation state */
      form.hidden = true;
      var success = document.getElementById(form.getAttribute("data-success"));
      if (success) {
        success.classList.add("is-visible");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    });

    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".form-field");
        if (field && input.checkValidity()) { field.classList.remove("has-error"); }
      });
    });
  });
})();
