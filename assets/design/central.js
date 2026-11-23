// Central — protótipo: dia da semana pela data (nunca escrito à mão), estados (?estado=) e modo claro/escuro.
(function () {
  var dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  document.querySelectorAll("[data-data]").forEach(function (e) {
    var p = e.dataset.data.split("-"), d = new Date(+p[0], p[1] - 1, +p[2]);
    e.textContent = (e.dataset.formato === "curto" ? "" : dias[d.getDay()] + ", ") + d.getDate() + " de " + meses[d.getMonth()];
  });
  var q = new URLSearchParams(location.search), estado = q.get("estado") || "normal";
  var blocos = document.querySelectorAll("[data-estado]");
  if (![].some.call(blocos, function (b) { return b.dataset.estado === estado; })) estado = "normal";
  blocos.forEach(function (b) { b.classList.toggle("ativo", b.dataset.estado === estado); });
  try { var m = localStorage.getItem("central-modo"); if (m) document.documentElement.dataset.theme = m; } catch (e) {}
  document.querySelectorAll("[data-modo]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.dataset.modo;
      if (m === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = m;
      try { m === "auto" ? localStorage.removeItem("central-modo") : localStorage.setItem("central-modo", m); } catch (e) {}
    });
  });
  // Dar um presente (PE7): depois de descrever, aparecem o lugar, o preço e a entrega (sem toque a mais).
  var desc = document.querySelector("[data-presente]");
  if (desc) desc.addEventListener("input", function () { document.querySelector("[data-previa]").hidden = !desc.value.trim(); });
})();
