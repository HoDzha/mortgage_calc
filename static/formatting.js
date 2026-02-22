// Автоформатирование чисел с пробелами по разрядам.

const GROUP_SEPARATOR = " ";

const formatWithSpaces = (value) => {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  if (normalized === "") {
    return "";
  }

  const [integer, fractional] = normalized.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return fractional !== undefined ? `${grouped}.${fractional}` : grouped;
};

const bindFormatting = () => {
  const inputs = document.querySelectorAll("input[data-format]");

  inputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target;
      const value = target.value;

      if (value === "") {
        return;
      }

      target.value = formatWithSpaces(value);
    });
  });
};

document.addEventListener("DOMContentLoaded", bindFormatting);

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("installment-toggle");
  const rateField = document.getElementById("rate-field");
  const rateInput = rateField?.querySelector("input[name='annual_rate']");

  if (!toggle || !rateField || !rateInput) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isActive = toggle.classList.toggle("is-active");
    rateField.classList.toggle("is-hidden", isActive);
    if (isActive) {
      rateInput.value = "";
      rateInput.required = false;
      rateInput.disabled = true;
    } else {
      rateInput.disabled = false;
      rateInput.required = true;
    }
  });
});
