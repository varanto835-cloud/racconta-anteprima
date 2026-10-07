/* Racconta · bobimpakt.it — la console risponde: l'ago della scala segue lo scroll, i VU meter si muovono quando scrivi, la lampada IN ONDA pulsa quando il talkback è pronto. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- VU meter: tacche e aghi ---------- */
  var PIVOT = { x: 100, y: 150 }, RAGGIO = 100, RIPOSO = -46;
  function polare(gradi, r) { var a = gradi * Math.PI / 180; return { x: PIVOT.x + r * Math.sin(a), y: PIVOT.y - r * Math.cos(a) }; }
  $$('.vu__tacche').forEach(function (g) {
    var ns = 'http://www.w3.org/2000/svg';
    for (var d = -50; d <= 50; d += 5) {
      var grande = d % 10 === 0, a = polare(d, RAGGIO), b = polare(d, RAGGIO - (grande ? 10 : 5));
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', a.x.toFixed(1)); l.setAttribute('y1', a.y.toFixed(1)); l.setAttribute('x2', b.x.toFixed(1)); l.setAttribute('y2', b.y.toFixed(1));
      if (d >= 28) l.setAttribute('stroke', '#d9342b');
      g.appendChild(l);
    }
  });
  var aghi = $$('.vu__ago');
  function ago(i, gradi) { if (!aghi[i] || ridotto) return; aghi[i].style.setProperty('--ago', Math.max(-50, Math.min(50, gradi)) + 'deg'); }
  var vuTimer = null;
  function voce(forza) {
    // la voce entra dal canale sinistro; la redazione (destro) risponde un attimo dopo, un po' più piano
    var picco = -14 + forza * 44;
    ago(0, picco + (Math.random() * 10 - 5));
    setTimeout(function () { ago(1, picco - 9 + (Math.random() * 8 - 4)); }, 140);
    clearTimeout(vuTimer);
    vuTimer = setTimeout(function () { ago(0, RIPOSO); setTimeout(function () { ago(1, RIPOSO); }, 160); }, 520);
  }

  /* ---------- scala delle frequenze: l'ago segue lo scroll ---------- */
  var scala = $('#scala'), corpo = scala && $('.scala__corpo', scala), lista = scala && $('.scala__stazioni', scala), agoScala = $('#ago');
  var stazioni = $$('[data-stazione]').map(function (a) { return { a: a, sez: document.getElementById(a.getAttribute('href').slice(1)) }; }).filter(function (s) { return s.sez; });
  var attiva = null;
  function sintonizza(st, iniziale) {
    if (!st || st === attiva) return;
    attiva = st;
    stazioni.forEach(function (s) { s.a.classList.toggle('is-sintonizzata', s === st); s.sez.classList.toggle('is-sintonizzata', s === st); });
    var ra = st.a.getBoundingClientRect(), rc = corpo.getBoundingClientRect();
    agoScala.style.setProperty('--ago-x', (ra.left - rc.left + ra.width / 2).toFixed(1) + 'px');
    if (!iniziale && lista.scrollWidth > lista.clientWidth) {
      var x = st.a.offsetLeft - lista.clientWidth / 2 + st.a.offsetWidth / 2;
      lista.scrollTo({ left: x, behavior: ridotto ? 'auto' : 'smooth' });
    }
  }
  function stazioneCorrente() {
    var riferimento = window.innerHeight * 0.38, scelta = null;
    stazioni.forEach(function (s) { if (s.sez.getBoundingClientRect().top <= riferimento) scelta = s; });
    return scelta;
  }
  var ticking = false;
  function suScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; var s = stazioneCorrente(); if (s) sintonizza(s); else if (attiva) { /* sopra la prima stazione: l'ago resta sulla prima */ sintonizza(stazioni[0]); } });
  }
  if (scala && stazioni.length) {
    // all'avvio l'ago parte dal bordo e si sintonizza sulla prima stazione: l'unico ingresso in scena della pagina
    // posizione corretta subito (senza transizione), poi l'ingresso in scena: l'ago parte dal bordo e si sintonizza sulla prima stazione
    sintonizza(stazioneCorrente() || stazioni[0], true);
    if (!ridotto) { agoScala.style.transition = 'none'; agoScala.style.setProperty('--ago-x', '24px'); window.addEventListener('load', function () { requestAnimationFrame(function () { agoScala.style.transition = ''; var s = attiva; attiva = null; sintonizza(s || stazioni[0], true); }); }); }
    window.addEventListener('scroll', suScroll, { passive: true });
    window.addEventListener('resize', function () { var s = attiva; attiva = null; sintonizza(s || stazioni[0], true); });
    lista.addEventListener('scroll', function () { var s = attiva; attiva = null; if (s) sintonizza(s, true); }, { passive: true });
    stazioni.forEach(function (s) { s.a.addEventListener('click', function () { sintonizza(s); }); });
  }

  /* ---------- talkback ---------- */
  var modulo = $('#modulo'), esito = $('#esito'), lampada = $('#lampada');
  if (modulo) {
    var campi = $$('input[required], select', modulo), consenso = $('#consenso', modulo);
    function valido(mostra) {
      var ok = true;
      campi.forEach(function (c) {
        if (c.type === 'checkbox') return;
        var vuoto = !String(c.value || '').trim();
        if (mostra) c.classList.toggle('is-errato', vuoto);
        if (vuoto) ok = false;
      });
      if (consenso && !consenso.checked) ok = false;
      return ok;
    }
    function aggiorna() {
      var ok = valido(false);
      modulo.classList.toggle('is-valido', ok);
      if (lampada) lampada.classList.toggle('is-pulsante', ok);
    }
    modulo.addEventListener('input', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) { e.target.classList.remove('is-errato'); voce(Math.min(1, 0.35 + String(e.target.value || '').length / 40)); }
      aggiorna();
    });
    modulo.addEventListener('change', aggiorna);
    function mostraEsito(testo, tipo) { esito.hidden = false; esito.textContent = testo; esito.className = 'modulo__esito' + (tipo ? ' is-' + tipo : ''); }
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valido(true)) { mostraEsito(consenso && !consenso.checked && campi.every(function (c) { return c.type === 'checkbox' || String(c.value).trim(); }) ? 'Manca la spunta sull\'uso dei dati: serve per poterti richiamare.' : 'Mancano nome, sito o telefono: senza, non so chi richiamare.', 'errore'); var primo = $('.is-errato', modulo); if (primo) primo.focus(); return; }
      // Anteprima (es. GitHub Pages, senza PHP): il modulo si prova ma non invia nulla.
      if (modulo.getAttribute('data-anteprima') === '1') { voce(1); mostraEsito('Questa è un\'anteprima: qui la richiesta partirebbe. Il modulo funziona quando il sito è online su bobimpakt.it.', 'ok'); if (lampada) { lampada.classList.add('is-pulsante'); setTimeout(function () { lampada.classList.remove('is-pulsante'); }, 4000); } return; }
      modulo.classList.add('is-inviando');
      mostraEsito('Invio in corso…');
      voce(1); setTimeout(function () { voce(.8); }, 300);
      var fd = new FormData(modulo);
      fetch(modulo.action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { ok: false, messaggio: 'Risposta non leggibile dal server.' }; }); })
        .then(function (r) {
          modulo.classList.remove('is-inviando');
          if (r && r.ok) { mostraEsito(r.messaggio || 'Ricevuto. Ti richiamo io.', 'ok'); modulo.reset(); aggiorna(); if (lampada) { lampada.classList.add('is-pulsante'); setTimeout(function () { lampada.classList.remove('is-pulsante'); }, 4000); } }
          else mostraEsito((r && r.messaggio) || 'Non sono riuscito a inviare la richiesta. Scrivimi su WhatsApp, qui accanto.', 'errore');
        })
        .catch(function () { modulo.classList.remove('is-inviando'); mostraEsito('Il server non risponde. Scrivimi su WhatsApp, qui accanto: arriva lo stesso.', 'errore'); });
    });
    // senza JavaScript il server rimanda qui con ?inviato=1 o ?errore=1
    var q = new URLSearchParams(window.location.search);
    if (q.get('inviato') === '1') mostraEsito('Ricevuto. Ti richiamo io.', 'ok');
    if (q.get('errore') === '1') mostraEsito('Qualcosa non è andato nell\'invio. Scrivimi su WhatsApp, qui accanto.', 'errore');
  }

  /* ---------- WhatsApp: il numero si imposta in un punto solo (data-numero) ---------- */
  var wa = $('#whatsapp');
  if (wa) {
    var numero = (wa.getAttribute('data-numero') || '').replace(/\D/g, '');
    var testo = encodeURIComponent('Ciao Roberto, vorrei sapere di più su Racconta.');
    // un numero vero ha prefisso + almeno 9 cifre; il segnaposto «39XXXXXXXXXX» ne lascia 2
    if (numero.length >= 11) wa.href = 'https://wa.me/' + numero + '?text=' + testo;
    else {
      wa.title = 'Numero WhatsApp da impostare (data-numero)';
      wa.addEventListener('click', function (e) {
        e.preventDefault();
        if (esito) { esito.hidden = false; esito.className = 'modulo__esito'; esito.textContent = 'Il numero WhatsApp non è ancora impostato: in questa anteprima il tasto non apre la chat.'; }
      });
    }
  }
})();
