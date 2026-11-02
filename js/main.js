/* Clean Agency — comportements du site
   Aucune dépendance. Tout est facultatif : sans ce script, la page reste complète et lisible. */
(() => {
  'use strict';

  const racine = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)');
  const NS = 'http://www.w3.org/2000/svg';

  window.__cleanOk = true;

  /* ---------- Année du pied de page ---------- */
  $$('[data-annee]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- En-tête : filet au défilement ---------- */
  const surDefilement = () => racine.classList.toggle('est-defile', window.scrollY > 8);
  surDefilement();
  window.addEventListener('scroll', surDefilement, { passive: true });

  /* ---------- Menu plein écran (mobile) ---------- */
  const burger = $('.burger');
  const menu = $('#menu');
  if (burger && menu) {
    const zonesInertes = [$('main'), $('footer'), $('.barre-mobile')].filter(Boolean);
    const libelle = $('.sr-only', burger);
    $$('.menu__lien', menu).forEach((a, i) => a.style.setProperty('--i', i));

    const basculer = (ouvrir) => {
      burger.setAttribute('aria-expanded', String(ouvrir));
      if (libelle) libelle.textContent = ouvrir ? 'Fermer le menu' : 'Menu';
      menu.classList.toggle('est-ouvert', ouvrir);
      if (ouvrir) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      zonesInertes.forEach((z) => (ouvrir ? z.setAttribute('inert', '') : z.removeAttribute('inert')));
      racine.style.overflow = ouvrir ? 'hidden' : '';
      if (ouvrir) window.setTimeout(() => { const a = $('.menu__lien', menu); if (a) a.focus({ preventScroll: true }); }, 140);
    };

    burger.addEventListener('click', () => basculer(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => { a.blur(); basculer(false); }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { basculer(false); burger.focus(); }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches) basculer(false); });
  }

  /* ---------- Lien de navigation actif ---------- */
  const liens = new Map($$('.nav__lien').map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = $$('main > section[id]').filter((s) => liens.has(s.id));
  if ('IntersectionObserver' in window && sections.length) {
    const espion = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        liens.forEach((a) => a.removeAttribute('aria-current'));
        liens.get(e.target.id).setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-42% 0px -53% 0px' });
    sections.forEach((s) => espion.observe(s));
  }

  /* ---------- Boutons : calque de balayage diagonal (le texte s'inverse avec le fond) ---------- */
  $$('.bouton').forEach((b) => {
    const inv = document.createElement('span');
    inv.className = 'bouton__inv';
    inv.setAttribute('aria-hidden', 'true');
    inv.innerHTML = b.innerHTML;
    b.appendChild(inv);
    b.classList.add('a-calque');
  });

  /* ---------- Hero : calque inversé (le titre change de couleur dans le faisceau) ---------- */
  const hero = $('.hero');
  const coucheHero = hero && $('.hero__couche', hero);
  if (coucheHero) {
    const inverse = coucheHero.cloneNode(true);
    inverse.classList.add('hero__couche--inverse');
    inverse.setAttribute('aria-hidden', 'true');
    inverse.setAttribute('inert', '');
    $$('[id]', inverse).forEach((el) => el.removeAttribute('id'));
    $$('a, button', inverse).forEach((el) => el.setAttribute('tabindex', '-1'));
    // un seul <h1> dans la page : le double devient un simple bloc
    const titreCopie = $('h1', inverse);
    if (titreCopie) {
      const bloc = document.createElement('div');
      bloc.className = titreCopie.className;
      bloc.innerHTML = titreCopie.innerHTML;
      titreCopie.replaceWith(bloc);
    }
    hero.appendChild(inverse);
  }

  /* Séquence d'entrée : on attend les polices pour ne rien voir sauter */
  const demarrer = () => window.requestAnimationFrame(() => racine.classList.add('est-pret'));
  if (reduit.matches || !document.fonts || !document.fonts.load) {
    demarrer();
  } else {
    Promise.race([
      Promise.all([document.fonts.load('1em CLEAN'), document.fonts.load('400 1em Inter')]),
      new Promise((ok) => window.setTimeout(ok, 1600)),
    ]).then(demarrer, demarrer);
  }

  /* ---------- Apparitions au défilement ---------- */
  const aReveler = $$('[data-apparition]');
  const tousVisibles = () => aReveler.forEach((el) => el.classList.add('est-visible'));
  if (!('IntersectionObserver' in window) || reduit.matches) {
    tousVisibles();
  } else {
    // Les titres « coupe » sont masqués par un clip-path que l'observateur prend en compte :
    // on observe leur conteneur à la place, sinon ils ne se révéleraient jamais.
    const observes = new Map();
    aReveler.forEach((el) => {
      const cible = el.dataset.apparition === 'coupe' ? el.parentElement : el;
      if (!observes.has(cible)) observes.set(cible, []);
      observes.get(cible).push(el);
    });
    const obs = new IntersectionObserver((entrees) => {
      let rang = 0;
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        const delai = (rang++ * 0.1).toFixed(2) + 's';
        observes.get(e.target).forEach((el) => {
          el.style.setProperty('--d', delai);
          el.classList.add('est-visible');
          if (el.matches('[data-avap]')) indiceAvap(el);
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    observes.forEach((_, cible) => obs.observe(cible));
  }

  /* Pied de page : le logo se recompose quand on y arrive */
  const pied = $('.pied');
  if (pied && 'IntersectionObserver' in window) {
    const obsPied = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { pied.classList.add('est-visible'); obsPied.disconnect(); }
    }, { threshold: 0.25 });
    obsPied.observe(pied);
  } else if (pied) {
    pied.classList.add('est-visible');
  }

  /* ---------- Gerbe d'étincelles (survol des boutons principaux, envoi du formulaire) ---------- */
  const couleursGerbe = ['var(--framboise)', 'var(--rose)', 'var(--framboise)'];
  const gerbe = (x, y, n = 5, portee = 44) => {
    for (let i = 0; i < n; i++) {
      const s = document.createElementNS(NS, 'svg');
      const u = document.createElementNS(NS, 'use');
      const angle = Math.random() * Math.PI * 2;
      const dist = portee * (0.6 + Math.random() * 0.9);
      u.setAttribute('href', '#e' + (1 + Math.floor(Math.random() * 7)));
      s.appendChild(u);
      s.setAttribute('class', 'eclat');
      s.setAttribute('aria-hidden', 'true');
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      s.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
      s.style.setProperty('--rot', (Math.random() * 160 - 80).toFixed(0) + 'deg');
      s.style.setProperty('--t', (11 + Math.random() * 15).toFixed(0) + 'px');
      s.style.setProperty('--c', couleursGerbe[i % couleursGerbe.length]);
      s.style.animationDelay = (i * 0.04).toFixed(2) + 's';
      s.addEventListener('animationend', () => s.remove());
      document.body.appendChild(s);
    }
  };
  if (pointeurFin.matches && !reduit.matches) {
    $$('.bouton:not(.bouton--contour)').forEach((b) => {
      let dernier = 0;
      b.addEventListener('pointerenter', () => {
        const t = performance.now();
        if (t - dernier < 900) return;
        dernier = t;
        const r = b.getBoundingClientRect();
        gerbe(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height / 2, 4, Math.max(36, r.height * 0.9));
      });
    });
  }

  /* ---------- Parallaxe douce sur le hero (le poing et les étincelles bougent à des vitesses différentes) ---------- */
  const mobiles = $$('[data-parallaxe]');
  if (mobiles.length && !reduit.matches) {
    let cible = 0;
    let courant = 0;
    let enCours = false;
    const boucle = () => {
      courant += (cible - courant) * 0.12;
      mobiles.forEach((el) => { el.style.translate = '0 ' + (courant * parseFloat(el.dataset.parallaxe)).toFixed(1) + 'px'; });
      if (Math.abs(cible - courant) > 0.15) window.requestAnimationFrame(boucle); else enCours = false;
    };
    const surScroll = () => {
      cible = Math.min(window.scrollY, window.innerHeight * 1.2);
      if (!enCours) { enCours = true; window.requestAnimationFrame(boucle); }
    };
    window.addEventListener('scroll', surScroll, { passive: true });
  }

  /* ---------- Avant / après ---------- */
  function indiceAvap(figure) {
    const curseur = $('.avap__curseur', figure);
    if (!curseur || reduit.matches) return;
    let interrompu = false;
    curseur.addEventListener('pointerdown', () => { interrompu = true; }, { once: true });
    curseur.addEventListener('keydown', () => { interrompu = true; }, { once: true });
    const t0 = performance.now();
    const pas = (t) => {
      if (interrompu) return;
      const k = Math.min(1, (t - t0) / 1500);
      const e = 1 - Math.pow(1 - k, 3);
      const p = 94 + (50 - 94) * e;
      figure.style.setProperty('--p', p.toFixed(1));
      curseur.value = String(Math.round(p));
      if (k < 1) window.requestAnimationFrame(pas);
    };
    figure.style.setProperty('--p', '94');
    window.requestAnimationFrame(pas);
  }
  $$('[data-avap]').forEach((figure) => {
    const curseur = $('.avap__curseur', figure);
    if (!curseur) return;
    curseur.addEventListener('input', () => figure.style.setProperty('--p', curseur.value));
  });

  /* ---------- Formulaire de devis ---------- */
  const form = $('#formulaire-devis');
  if (form) {
    const etat = $('.formulaire__etat', form);
    const champs = $$('.champ__saisie', form);
    const envoyer = $('button[type="submit"]', form);
    const adresseService = () => {
      const a = (form.dataset.endpoint || '').trim();
      return a !== '' && !a.startsWith('[') ? a : '';   // « [URL_DU_SERVICE…] » = pas encore renseigné
    };
    const adresseMail = (form.getAttribute('action') || '').replace(/^mailto:/i, '');
    const lienWhatsapp = $('a[href^="https://wa.me/"]');
    const baseWhatsapp = lienWhatsapp ? lienWhatsapp.href.split('?')[0] : '';

    // Les boutons « Devis pour… » présélectionnent le type de lieu (et ?lieu=gite dans l'adresse aussi)
    const selectLieu = $('#f-lieu');
    const prechoisir = (valeur) => {
      if (selectLieu && $('option[value="' + valeur + '"]', selectLieu)) selectLieu.value = valeur;
    };
    $$('[data-lieu]').forEach((a) => a.addEventListener('click', () => prechoisir(a.dataset.lieu)));
    const depuisAdresse = new URLSearchParams(window.location.search).get('lieu');
    if (depuisAdresse) prechoisir(depuisAdresse);

    const message = (c) => {
      if (c.validity.valueMissing) return 'Ce champ est nécessaire.';
      if (c.validity.typeMismatch) return 'Vérifiez cette adresse e-mail.';
      if (c.validity.customError) return 'Vérifiez ce numéro de téléphone.';
      return 'Vérifiez cette information.';
    };

    const verifier = () => {
      let premier = null;
      champs.forEach((c) => {
        if (c.type === 'tel') c.setCustomValidity(c.value.replace(/\D/g, '').length >= 9 || !c.value ? '' : 'tel');
        const bloc = c.closest('.champ');
        let erreur = $('.champ__erreur', bloc);
        const valide = c.checkValidity();
        bloc.classList.toggle('est-invalide', !valide);
        c.setAttribute('aria-invalid', String(!valide));
        if (!valide) {
          if (!erreur) {
            erreur = document.createElement('p');
            erreur.className = 'champ__erreur';
            erreur.id = c.id + '-erreur';
            bloc.appendChild(erreur);
            c.setAttribute('aria-describedby', erreur.id);
          }
          erreur.textContent = message(c);
          if (!premier) premier = c;
        } else if (erreur) {
          erreur.remove();
          c.removeAttribute('aria-describedby');
        }
      });
      return premier;
    };
    champs.forEach((c) => c.addEventListener('input', () => { if (c.closest('.champ').classList.contains('est-invalide')) verifier(); }));

    const corps = () => {
      const d = new FormData(form);
      const lieu = selectLieu && selectLieu.selectedIndex > 0 ? selectLieu.options[selectLieu.selectedIndex].text : '';
      const lignes = [
        'Bonjour,', '',
        'Je souhaite un devis pour un ménage.', '',
        'Nom : ' + (d.get('nom') || ''),
        'Téléphone : ' + (d.get('telephone') || ''),
        'E-mail : ' + (d.get('email') || ''),
        'Type de lieu : ' + lieu,
        'Ville : ' + (d.get('ville') || ''),
      ];
      const libre = String(d.get('message') || '').trim();
      if (libre) lignes.push('', libre);
      return lignes.join('\n');
    };

    const succes = () => {
      form.classList.add('est-envoye');
      etat.textContent = 'Merci ! Votre demande est bien envoyée. Je vous réponds très vite.';
      const r = form.getBoundingClientRect();
      if (!reduit.matches) gerbe(r.left + r.width / 2, Math.max(80, r.top + 90), 9, 120);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const piege = $('input[name="_gotcha"]', form);
      if (piege && piege.value) return;
      const premier = verifier();
      if (premier) {
        etat.textContent = 'Merci de compléter les champs signalés.';
        premier.focus();
        return;
      }
      const service = adresseService();
      if (service) {
        envoyer.disabled = true;
        etat.textContent = 'Envoi en cours…';
        try {
          const rep = await fetch(service, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          const json = await rep.json().catch(() => ({}));
          if (!rep.ok || json.success === false || json.ok === false) throw new Error('refus');
          succes();
        } catch (_) {
          etat.textContent = 'L’envoi n’a pas abouti. Réessayez, ou appelez le 07\u00a061\u00a079\u00a079\u00a051.';
        } finally {
          envoyer.disabled = false;
        }
      } else {
        const sujet = encodeURIComponent('Demande de devis – cleanagency.fr');
        window.location.href = 'mailto:' + adresseMail + '?subject=' + sujet + '&body=' + encodeURIComponent(corps());
        etat.textContent = 'Votre messagerie s’ouvre avec votre demande déjà rédigée : il ne reste qu’à l’envoyer.';
      }
    });

    const boutonWhatsapp = $('[data-whatsapp]', form);
    if (boutonWhatsapp && baseWhatsapp) {
      boutonWhatsapp.addEventListener('click', () => {
        window.open(baseWhatsapp + '?text=' + encodeURIComponent(corps()), '_blank', 'noopener');
      });
    }
  }

  /* ---------- Barre d'actions mobile : visible après le hero, masquée sur le contact et le pied ---------- */
  const barre = $('.barre-mobile');
  if (barre && hero && 'IntersectionObserver' in window) {
    let heroVu = true;
    let finVue = false;
    const maj = () => barre.classList.toggle('est-visible', !heroVu && !finVue);
    new IntersectionObserver((es) => { heroVu = es[0].isIntersecting; maj(); }, { threshold: 0.3 }).observe(hero);
    const fin = new IntersectionObserver((es) => { finVue = es.some((e) => e.isIntersecting); maj(); }, { threshold: 0.1 });
    [$('#contact'), $('.pied')].filter(Boolean).forEach((el) => fin.observe(el));
  }
})();
