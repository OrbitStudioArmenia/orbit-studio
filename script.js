const form = document.querySelector("#registration-form");
const status = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");
const year = document.querySelector("#current-year");

if (year) year.textContent = new Date().getFullYear();

if (form && status && submitButton) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = "Ուղարկվում է…";
    status.textContent = "Խնդրում ենք սպասել․ հայտը ուղարկվում է։";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Form submission failed");

      form.reset();
      status.textContent = "Շնորհակալություն։ Ձեր հայտը հաջողությամբ ուղարկվել է։ Մենք կապ կհաստատենք ձեզ հետ։";
    } catch {
      status.textContent = "Չհաջողվեց ուղարկել հայտը։ Խնդրում ենք կրկին փորձել կամ կապվել մեզ հետ WhatsApp-ով։";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });
}