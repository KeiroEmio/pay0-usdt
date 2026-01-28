(function () {
  var search = window.location.search || "";
  if (!search) return;

  var params = new URLSearchParams(search);

  var product  = params.get("product")  || params.get("title") || "";
  var quantity = params.get("quantity") || params.get("qty")   || "";
  var amount   = params.get("amount")   || "";

  window.addEventListener("DOMContentLoaded", function () {
    var productEl = document.getElementById("productTitleText");
    var qtyEl     = document.getElementById("quantityText");
    var amountEl  = document.getElementById("amountText2");

    if (productEl && product)  productEl.textContent = product;
    if (qtyEl && quantity)     qtyEl.textContent     = quantity;
    if (amountEl && amount)    amountEl.textContent  = amount;
  });
})();