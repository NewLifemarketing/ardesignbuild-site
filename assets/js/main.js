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

  /* Quote form: validation + honeypot, then a background POST to GoHighLevel.
     Our form's design is untouched — on a valid submit we send the fields as
     JSON to a GHL Inbound Webhook (Automation → Workflows → Inbound Webhook
     trigger). CORS is open on that endpoint, so this works straight from the
     static site with no server. On success we show our own success panel and
     reset the form; on failure we show an error with a fallback phone/email
     and log the details to the console.
     TO POINT AT A DIFFERENT GHL WEBHOOK: change GHL_WEBHOOK_URL below. */
  var GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/Dbqs3kRYC9G6e0THoG6c/webhook-trigger/13e71e95-de35-4209-984d-13f5b7e2a3a3";
  var LEADS_EMAIL = "laura@arcarpentry.com";
  var LEADS_PHONE = "(705) 436-4663";

  /* Map our form field names -> the JSON keys sent to GoHighLevel.
     (Map these keys to contact fields inside the GHL workflow.) */
  var GHL_KEYS = {
    email: "email", phone: "phone", town: "city", build_type: "build_type",
    plan: "plan_of_interest", lot_status: "lot_status", timeline: "timeline",
    budget: "budget_range", message: "message"
  };

  function buildPayload(form) {
    var payload = {};
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (!el.name || el.name === "company_website") { return; }
      var val = (el.value || "").trim();
      if (!val) { return; }
      if (el.name === "name") {
        payload.full_name = val;
        var parts = val.split(/\s+/);
        payload.first_name = parts.shift();
        payload.last_name = parts.join(" ");
      } else if (GHL_KEYS[el.name]) {
        payload[GHL_KEYS[el.name]] = val;
      } else {
        payload[el.name] = val;
      }
    });
    /* Provenance so the team can see where each lead came from */
    var planEl = form.querySelector("[name='plan']");
    payload.source = form.id === "download-form"
      ? "A&R Website — Plan Catalogue Request"
      : (planEl && planEl.value ? "A&R Website — Quote Request (" + planEl.value + ")"
                                : "A&R Website — Request a Quote");
    payload.form_name = form.id || "quote-form";
    payload.page_url = window.location.href;
    payload.submitted_at = new Date().toISOString();
    return payload;
  }

  function showError(form, msg) {
    var box = form.querySelector(".form-error");
    if (!box) {
      box = document.createElement("p");
      box.className = "form-error";
      box.setAttribute("role", "alert");
      var btn = form.querySelector("button[type='submit']");
      (btn && btn.parentNode ? btn.parentNode : form).insertBefore(box, btn || null);
    }
    box.textContent = msg;
  }

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

      var btn = form.querySelector("button[type='submit']");
      var btnText = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      var errBox = form.querySelector(".form-error");
      if (errBox) { errBox.textContent = ""; }

      fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form))
      }).then(function (res) {
        if (!res.ok) { throw new Error("GHL webhook responded " + res.status); }
        /* Success — show our own confirmation panel and reset the form */
        form.reset();
        form.hidden = true;
        var success = document.getElementById(form.getAttribute("data-success"));
        if (success) {
          success.classList.add("is-visible");
          success.setAttribute("tabindex", "-1");
          success.focus();
        }
      }).catch(function (err) {
        console.error("Quote form → GoHighLevel submission failed:", err);
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
        showError(form, "Sorry — something went wrong sending your request. Please try again, " +
          "or reach us directly at " + LEADS_PHONE + " or " + LEADS_EMAIL + ".");
      });
    });

    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".form-field");
        if (field && input.checkValidity()) { field.classList.remove("has-error"); }
      });
    });
  });
})();
