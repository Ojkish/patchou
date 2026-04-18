// js/utils.js

/**
 * Lit et convertit la valeur d'un champ input numérique en entier.
 * @param {string} id - ID de l'élément <input>
 * @returns {number|null} - la valeur entière ou null si invalide
 */
export function getValidInt(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const val = parseInt(el.value, 10);
  return isNaN(val) ? null : val;
}

/**
 * Configure les contrôles de type "+" / "-" avec support tactile et accélération.
 * @param {string} selector - sélecteur CSS pour les boutons de contrôle (.number-control)
 */
export function setupNumberControls(selector) {
  const buttons = document.querySelectorAll(selector);

  buttons.forEach(btn => {
    let timer = null;
    let initialDelayTimer = null;
    let currentInterval = 200; // Vitesse initiale en ms

    const targetId = btn.dataset.target;
    const action = btn.dataset.action;
    const target = document.getElementById(targetId);

    if (!target) return;

    /** Exécute une seule modification de valeur */
    const adjust = () => {
      let v = parseInt(target.value, 10) || 0;
      const min = parseInt(target.getAttribute('min'), 10) || 1;
      const max = parseInt(target.getAttribute('max'), 10) || 512;

      if (action === 'increment') {
        v = v < max ? v + 1 : v;
      } else {
        v = v > min ? v - 1 : min;
      }

      target.value = v;

      // Vibration haptique (si disponible)
      if (navigator.vibrate) navigator.vibrate(10);

      // Déclenche l'événement 'input' pour mettre à jour le patch en temps réel
      target.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Cas spécifique pour l'univers (compatibilité avec tes anciens scripts)
      if (targetId === 'universe') {
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    /** Démarre la boucle d'accélération */
    const startEffect = (e) => {
      // Empêche les comportements par défaut (zoom, menu contextuel sur mobile)
      if (e.type === 'touchstart') e.preventDefault();
      
      adjust(); // Premier clic immédiat

      initialDelayTimer = setTimeout(() => {
        const loop = () => {
          adjust();
          // Accélération : on réduit l'intervalle jusqu'à un minimum de 40ms
          currentInterval = Math.max(40, currentInterval * 0.8);
          timer = setTimeout(loop, currentInterval);
        };
        loop();
      }, 400); // Délai avant de commencer à "mouliner" (appui long)
    };

    /** Arrête l'effet */
    const stopEffect = () => {
      clearTimeout(timer);
      clearTimeout(initialDelayTimer);
      timer = null;
      initialDelayTimer = null;
      currentInterval = 200;
    };

    // --- Listeners Souris ---
    btn.addEventListener('mousedown', startEffect);
    
    // --- Listeners Tactiles ---
    btn.addEventListener('touchstart', startEffect, { passive: false });

    // --- Arrêt global ---
    // On écoute sur window pour arrêter même si le doigt/souris glisse hors du bouton
    window.addEventListener('mouseup', stopEffect);
    window.addEventListener('touchend', stopEffect);
    window.addEventListener('touchcancel', stopEffect);
    // Empêche le clic simple de re-déclencher une action si le mousedown a déjà fait le job
    btn.addEventListener('click', e => e.preventDefault());
  });
}

/**
 * Récupère et parse une valeur JSON stockée dans localStorage.
 */
export function getFromLocalStorage(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Erreur de parsing JSON pour la clé ${key}:`, e);
    return null;
  }
}

/**
 * Sérialise et stocke un objet dans localStorage.
 */
export function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Erreur de stockage localStorage pour la clé ${key}:`, e);
  }
}

/**
 * Crée un élément DOM avec des propriétés et des enfants.
 */
export function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (key in el) {
      el[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  });
  return el;
}
