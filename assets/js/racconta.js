/* BobImpakt · Racconta — «La giornata in cammino».
   La voce: un'unica linea che passa per gli elementi .ancora (in ordine di data-ordine) e si disegna con lo scorrimento.
   Le parole del vocale d'esempio si posano lungo la prima curva; nella sezione sul problema la voce cancella le fatiche. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- la linea della voce ---------- */
  var svg = $('#voce'), traccia = $('#voce-traccia'), parole = $('#voce-parole'), passo = $('#voce-passo');
  var lunghezza = 0, minimo = 0, pronta = false;

  function punti() {
    return $$('.ancora').filter(function (a) { return a.offsetParent !== null; })
      .sort(function (a, b) { return (+a.getAttribute('data-ordine')) - (+b.getAttribute('data-ordine')); })
      .map(function (a) { var r = a.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, ordine: +a.getAttribute('data-ordine') }; });
  }
  function disegna() {
    if (!svg) return;
    // si chiude il disegno prima di misurare: altrimenti la sua altezza precedente allunga la pagina a ogni ricalcolo
    svg.setAttribute('width', 0); svg.setAttribute('height', 0);
    var w = document.documentElement.clientWidth, h = document.documentElement.scrollHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var p = punti(); if (p.length < 2) return;
    // schermi stretti: la voce corre lungo il margine destro, sempre dentro lo schermo
    var stretto = window.innerWidth <= 980;
    // il primo punto resta all'uscita del vocale: la voce nasce lì, poi un breve tratto curvo la porta al margine (7 px dal bordo, lontana da campi e tasti)
    if (stretto) p.forEach(function (q, i) { if (!(i === 0 && q.ordine === 1)) q.x = w - 7; });
    // primo tratto: esce dal vocale verso destra e scende curvando (porta le parole); poi curve a «S» con tangenti verticali
    var d = 'M' + p[0].x.toFixed(1) + ' ' + p[0].y.toFixed(1);
    var a = p[0], b = p[1], primo = (p[0].ordine === 1);
    // esce in orizzontale dal vocale (lì si posano le parole) e poi scende verso il bordo
    var spinta = primo ? Math.max(80, Math.min(300, b.x - a.x + 140)) : 0;
    d += ' C' + Math.min(w - 8, a.x + spinta).toFixed(1) + ' ' + a.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + (a.y + (b.y - a.y) * (primo ? .3 : .5)).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    for (var i = 2; i < p.length; i++) {
      a = p[i - 1]; b = p[i];
      var dy = Math.max(40, b.y - a.y), k = dy * .5;
      d += ' C' + a.x.toFixed(1) + ' ' + (a.y + k).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + (b.y - k).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    traccia.setAttribute('d', d);
    lunghezza = traccia.getTotalLength();
    // la parte dell'apertura (fino all'ancora 2) è sempre disegnata: è il vocale che parla
    minimo = lunghezzaAllaY(p[1].y);
    traccia.style.strokeDasharray = lunghezza + ' ' + lunghezza;
    pronta = true;
    aggiorna();
  }
  function lunghezzaAllaY(y) {
    var lo = 0, hi = lunghezza;
    for (var i = 0; i < 24; i++) { var m = (lo + hi) / 2; if (traccia.getPointAtLength(m).y < y) lo = m; else hi = m; }
    return lo;
  }
  var ultimo = -1;
  function aggiorna() {
    if (!pronta) return;
    var fatto = ridotto ? lunghezza : Math.max(minimo, Math.min(lunghezza, lunghezzaAllaY(window.scrollY + window.innerHeight * .62)));
    if (Math.abs(fatto - ultimo) < .5) return;
    ultimo = fatto;
    traccia.style.strokeDashoffset = (lunghezza - fatto).toFixed(1);
    var pt = traccia.getPointAtLength(fatto);
    passo.setAttribute('cx', pt.x.toFixed(1)); passo.setAttribute('cy', pt.y.toFixed(1));
  }
  var inCoda = false;
  function suScorrimento() { if (inCoda) return; inCoda = true; requestAnimationFrame(function () { inCoda = false; aggiorna(); }); }
  var tempoRidisegno = null;
  function ridisegna() { clearTimeout(tempoRidisegno); tempoRidisegno = setTimeout(function () { ultimo = -1; disegna(); }, 120); }

  if (svg) {
    window.addEventListener('scroll', suScorrimento, { passive: true });
    window.addEventListener('resize', ridisegna);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      disegna();
      // la pagina può ancora assestarsi (caratteri, immagini): si ricalcola quando cambia qualcosa di misurabile
      if ('ResizeObserver' in window) { var oss = new ResizeObserver(ridisegna); oss.observe(document.body); $$('main > section, .apertura__aria').forEach(function (s) { oss.observe(s); }); }
      window.addEventListener('load', ridisegna);
      setTimeout(ridisegna, 600);
      // le parole del vocale si posano lungo la curva: l'unico ingresso in scena della pagina
      if (parole) {
        var tp = parole.querySelector('textPath');
        parole.setAttribute('dy', '-14');
        if (ridotto) { tp.setAttribute('startOffset', '26'); parole.classList.add('is-detta'); return; }
        var t0 = performance.now(), da = 240, a = 26, durata = 1800;
        tp.setAttribute('startOffset', da);
        parole.classList.add('is-detta');
        (function passoParole(t) {
          var f = Math.min(1, (t - t0) / durata), e = 1 - Math.pow(2, -10 * f);
          tp.setAttribute('startOffset', (da + (a - da) * e).toFixed(1));
          if (f < 1) requestAnimationFrame(passoParole);
        })(t0);
      }
    });
  }

  /* ---------- la voce cancella le fatiche ---------- */
  var problema = $('#problema');
  if (problema) {
    if (ridotto || !('IntersectionObserver' in window)) problema.classList.add('is-vista');
    else new IntersectionObserver(function (voci, oss) {
      voci.forEach(function (v) { if (v.isIntersecting) { problema.classList.add('is-vista'); oss.disconnect(); } });
    }, { threshold: .55 }).observe($('.problema__testo', problema));
  }

  /* ---------- i moduli «Scarica l'App» ---------- */
  var MSG_OK = 'Ricevuto! Ti mando il link dell\'app su WhatsApp: lo apri e lo aggiungi alla schermata Home.';
  var MSG_ANTEPRIMA = 'Questa è un\'anteprima: qui la richiesta partirebbe e riceveresti il link su WhatsApp. Il modulo funziona quando il sito è online su bobimpakt.it.';
  $$('form[data-modulo]').forEach(function (modulo) {
    var esito = $('.modulo__esito', modulo), nome = $('input[name="nome"]', modulo), tel = $('input[name="telefono"]', modulo), consenso = $('input[name="consenso"]', modulo);
    function mostra(testo, tipo) { esito.hidden = false; esito.textContent = testo; esito.className = 'modulo__esito' + (tipo ? ' is-' + tipo : ''); }
    function controlla() {
      var mancano = [];
      [nome, tel].forEach(function (c) { var vuoto = !String(c.value || '').trim(); c.classList.toggle('is-errato', vuoto); if (vuoto) mancano.push(c); });
      if (mancano.length) { mostra('Scrivi il tuo nome e il numero WhatsApp: è lì che ti mando il link.', 'errore'); mancano[0].focus(); return false; }
      if (!consenso.checked) { mostra('Manca la spunta sull\'uso dei dati: serve per poterti mandare il link.', 'errore'); consenso.focus(); return false; }
      return true;
    }
    modulo.addEventListener('input', function (e) { if (e.target.classList) e.target.classList.remove('is-errato'); });
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!controlla()) return;
      if (modulo.getAttribute('data-anteprima') === '1') { mostra(MSG_ANTEPRIMA); return; }
      modulo.classList.add('is-inviando'); mostra('Invio in corso…');
      fetch(modulo.action, { method: 'POST', body: new FormData(modulo), headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (r) {
          modulo.classList.remove('is-inviando');
          if (r && r.ok) { mostra(r.messaggio || MSG_OK); modulo.reset(); }
          else mostra((r && r.messaggio) || 'Non sono riuscito a inviare la richiesta. Scrivimi su WhatsApp: arriva lo stesso.', 'errore');
        })
        .catch(function () { modulo.classList.remove('is-inviando'); mostra('Il server non risponde. Scrivimi su WhatsApp: arriva lo stesso.', 'errore'); });
    });
  });
  // senza JavaScript il server rimanda qui con ?inviato=1 o ?errore=1: il messaggio compare nel modulo di chiusura
  var q = new URLSearchParams(window.location.search), ultimoEsito = $$('form[data-modulo] .modulo__esito').pop();
  if (ultimoEsito && q.get('inviato') === '1') { ultimoEsito.hidden = false; ultimoEsito.textContent = MSG_OK; }
  if (ultimoEsito && q.get('errore') === '1') { ultimoEsito.hidden = false; ultimoEsito.className = 'modulo__esito is-errore'; ultimoEsito.textContent = 'Qualcosa non è andato nell\'invio. Scrivimi su WhatsApp: arriva lo stesso.'; }

  /* ---------- WhatsApp: il numero si imposta in un punto solo (data-numero) ---------- */
  $$('a.whatsapp').forEach(function (wa) {
    var numero = (wa.getAttribute('data-numero') || '').replace(/\D/g, '');
    var testo = encodeURIComponent('Ciao Roberto, vorrei l\'app gratis di BobImpakt.');
    if (numero.length >= 11) { wa.href = 'https://wa.me/' + numero + '?text=' + testo; return; }
    wa.title = 'Numero WhatsApp da impostare (data-numero)';
    wa.addEventListener('click', function (e) {
      e.preventDefault();
      var esito = $('.modulo__esito', wa.closest('form') || document);
      if (esito) { esito.hidden = false; esito.className = 'modulo__esito'; esito.textContent = 'Il numero WhatsApp non è ancora impostato: in questa anteprima il collegamento non apre la chat.'; }
    });
  });
})();
