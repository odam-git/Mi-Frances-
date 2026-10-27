// Diálogos guiados (sin conexión). Cada turno del usuario acepta varias respuestas válidas.

export interface DialogueLine {
  speaker: 'otro' | 'tu';
  /** Texto francés modelo. En turnos del usuario es la respuesta de referencia. */
  fr: string;
  es: string;
  /** Respuestas aceptadas para turnos del usuario (normalizadas al comparar). */
  accept?: string[];
  /** Opciones de ayuda (la primera NO es necesariamente la correcta; se barajan). */
  choices?: string[];
  /** Pista en español si el usuario se bloquea. */
  hint?: string;
}

export interface Dialogue {
  id: string;
  title: string;
  situation: string;
  /** Ítems que conviene haber visto. */
  items: string[];
  lines: DialogueLine[];
}

export const DIALOGUES: Dialogue[] = [
  {
    id: 'presentarse',
    title: 'Conocer a alguien',
    situation: 'Llegas a una reunión y Marie se presenta.',
    items: ['bonjour', 'je-m-appelle', 'enchante', 'ca-va-bien', 'et-vous', 'merci'],
    lines: [
      { speaker: 'otro', fr: "Bonjour ! Je m'appelle Marie. Et vous ?", es: '¡Hola! Me llamo Marie. ¿Y usted?' },
      { speaker: 'tu', fr: "Bonjour ! Je m'appelle Paul.", es: '¡Hola! Me llamo (tu nombre).', accept: ["je m'appelle", "bonjour je m'appelle", 'je mappelle'], choices: ["Je m'appelle Paul.", 'Je suis un café.', 'Au revoir !'], hint: 'Di «me llamo» + tu nombre.' },
      { speaker: 'otro', fr: 'Enchantée ! Comment allez-vous ?', es: '¡Mucho gusto! ¿Cómo está?' },
      { speaker: 'tu', fr: 'Ça va bien, merci. Et vous ?', es: 'Bien, gracias. ¿Y usted?', accept: ['ça va bien merci et vous', 'ça va bien et vous', 'ça va bien merci', 'ça va et vous', 'ça va bien'], choices: ['Ça va bien, merci. Et vous ?', "Je voudrais l'addition.", 'Où est la gare ?'], hint: 'Responde «bien, gracias» y devuelve la pregunta.' },
      { speaker: 'otro', fr: 'Ça va bien, merci !', es: '¡Bien, gracias!' }
    ]
  },
  {
    id: 'cafe',
    title: 'En el café',
    situation: 'Estás en un café de París. El mesero se acerca.',
    items: ['bonjour', 'cafe', 'svp', 'eau', 'merci', 'addition', 'au-revoir', 'cinq'],
    lines: [
      { speaker: 'otro', fr: 'Bonjour !', es: '¡Buenos días!' },
      { speaker: 'tu', fr: "Bonjour ! Un café, s'il vous plaît.", es: '¡Buenos días! Un café, por favor.', accept: ["un café s'il vous plaît", "bonjour un café s'il vous plaît", 'je voudrais un café', "bonjour je voudrais un café s'il vous plaît", "je voudrais un café s'il vous plaît", 'bonjour je voudrais un café'], choices: ["Un café, s'il vous plaît.", 'Je ne comprends pas le chat.', 'Salut, Marie !'], hint: 'Pide «un café, por favor».' },
      { speaker: 'otro', fr: 'Un café. Et avec ça ?', es: 'Un café. ¿Algo más?' },
      { speaker: 'tu', fr: "De l'eau, s'il vous plaît.", es: 'Agua, por favor.', accept: ["de l'eau s'il vous plaît", "je voudrais de l'eau", "de l'eau", "je voudrais de l'eau s'il vous plaît"], choices: ["De l'eau, s'il vous plaît.", 'Deux chiens.', 'Bonsoir !'], hint: 'Pide agua: «de l\'eau».' },
      { speaker: 'otro', fr: 'Voilà !', es: '¡Aquí tiene!' },
      { speaker: 'tu', fr: "Merci ! L'addition, s'il vous plaît.", es: '¡Gracias! La cuenta, por favor.', accept: ["merci l'addition s'il vous plaît", "l'addition s'il vous plaît", "l'addition merci"], choices: ["Merci ! L'addition, s'il vous plaît.", "J'ai un livre.", 'Oui, je suis la gare.'], hint: 'Agradece y pide la cuenta.' },
      { speaker: 'otro', fr: "Cinq euros, s'il vous plaît.", es: 'Cinco euros, por favor.' },
      { speaker: 'tu', fr: 'Merci, au revoir !', es: '¡Gracias, adiós!', accept: ['merci au revoir', 'au revoir', 'merci au revoir monsieur', 'au revoir merci'], choices: ['Merci, au revoir !', 'Enchanté, je suis cinq.', 'Où sont les toilettes ?'], hint: 'Agradece y despídete.' }
    ]
  },
  {
    id: 'gare',
    title: 'Buscar la estación',
    situation: 'Estás perdido en la calle y necesitas encontrar la estación de tren.',
    items: ['excusez-moi', 'ou', 'gare', 'pardon', 'je-ne-comprends-pas', 'merci'],
    lines: [
      { speaker: 'tu', fr: 'Excusez-moi, où est la gare ?', es: 'Disculpe, ¿dónde está la estación?', accept: ['excusez-moi où est la gare', 'où est la gare', 'pardon où est la gare'], choices: ['Excusez-moi, où est la gare ?', "Je m'appelle la gare.", 'Bonsoir, un café !'], hint: 'Pide disculpas y pregunta dónde está la estación.' },
      { speaker: 'otro', fr: "La gare ? C'est là-bas, à droite.", es: '¿La estación? Está allá, a la derecha.' },
      { speaker: 'tu', fr: 'Pardon, je ne comprends pas.', es: 'Perdón, no entiendo.', accept: ['pardon je ne comprends pas', 'je ne comprends pas', 'excusez-moi je ne comprends pas'], choices: ['Pardon, je ne comprends pas.', 'Oui, deux pommes.', "J'aime le chat."], hint: 'Di que no entiendes.' },
      { speaker: 'otro', fr: 'Là-bas ! À droite !', es: '¡Allá! ¡A la derecha!' },
      { speaker: 'tu', fr: 'Ah ! Merci beaucoup !', es: '¡Ah! ¡Muchas gracias!', accept: ['merci beaucoup', 'ah merci beaucoup', 'merci', 'ah merci'], choices: ['Ah ! Merci beaucoup !', 'Non, la voiture.', 'Combien ?'], hint: 'Agradece mucho.' },
      { speaker: 'otro', fr: 'De rien !', es: '¡De nada!' }
    ]
  }
];
