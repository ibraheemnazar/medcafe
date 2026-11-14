const fileInput = document.getElementById("menu-file");
let previewUrl;
fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  const selection = document.getElementById("selection");
  const link = document.getElementById("preview-link");
  fileInput.setCustomValidity("");
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (!file) {
    selection.textContent = "";
    link.hidden = true;
    return;
  }
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf") ||
    file.size > 20 * 1024 * 1024
  ) {
    fileInput.setCustomValidity("Choose a PDF no larger than 20 MB.");
    selection.textContent = "Choose a PDF no larger than 20 MB.";
    link.hidden = true;
    fileInput.reportValidity();
    return;
  }
  selection.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  previewUrl = URL.createObjectURL(file);
  link.href = previewUrl;
  link.hidden = false;
  document.getElementById("preview-note").textContent =
    "Open preview to check the selected file, then publish when ready.";
});
document.getElementById("upload-form")?.addEventListener("submit", () => {
  const button = document.getElementById("publish-button");
  button.disabled = true;
  button.textContent = "Checking and publishing…";
});
document.querySelectorAll("time[data-timestamp]").forEach((element) => {
  element.textContent = new Date(
    Number(element.dataset.timestamp) * 1000,
  ).toLocaleString();
});
