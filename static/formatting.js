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
