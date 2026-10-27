import type { Item, Lesson } from './types';

// Unidad 1 (hacia A1): vocabulario de supervivencia de alta frecuencia.
// IPA en francés estándar de Francia (fr-FR). Español de referencia: México.

export const UNIT1_LESSONS: Lesson[] = [
  { unit: 1, lesson: 1, title: 'Saludos y cortesía', goal: 'Saludar, despedirte, agradecer y pedir algo con cortesía.' },
  { unit: 1, lesson: 2, title: 'Presentarte', goal: 'Decir tu nombre, preguntar cómo está alguien y responder.' },
  { unit: 1, lesson: 3, title: 'En el café', goal: 'Pedir algo de comer o beber y la cuenta.' },
  { unit: 1, lesson: 4, title: 'Personas y cosas', goal: 'Nombrar personas, animales y objetos cotidianos con su género.' },
  { unit: 1, lesson: 5, title: 'Moverte por la ciudad', goal: 'Preguntar dónde está algo y hablar de hoy y mañana.' },
  { unit: 1, lesson: 6, title: 'Números y verbos clave', goal: 'Contar del 1 al 5 y usar être y avoir en presente.' }
];

const NASAL = 'Vocal nasal: el aire sale por la nariz y NO se pronuncia ninguna «n» al final.';
const Y_SOUND = '[y]: pon los labios como para decir «u» y di «i». No es la «u» española.';

export const UNIT1_ITEMS: Item[] = [
  // ── Lección 1: Saludos y cortesía ─────────────────────────────────────────
  {
    id: 'bonjour', unit: 1, lesson: 1, fr: 'bonjour', es: 'buenos días / hola',
    esAccept: ['buenos dias', 'hola', 'buen dia', 'buenos dias hola', 'buenas tardes'],
    ipa: 'bɔ̃.ʒuʁ', pos: 'expresion', band: 1,
    example: { fr: 'Bonjour, madame !', es: '¡Buenos días, señora!' },
    grammar: 'Saludo estándar durante el día, formal o informal. Al entrar a una tienda se dice siempre.',
    phon: `«bon» tiene vocal nasal [ɔ̃]. ${NASAL} La «j» suena [ʒ]: como «sh» pero haciendo vibrar la garganta (la «ll» rioplatense).`,
    assoc: { type: 'semantica', story: 'bon (bueno) + jour (día) = «buen día». Un sol sonriente te saluda con la mano.', scene: { main: '☀️', prop: '👋', action: 'ninguna' } }
  },
  {
    id: 'bonsoir', unit: 1, lesson: 1, fr: 'bonsoir', es: 'buenas noches',
    esAccept: ['buenas noches', 'buenas tardes'],
    ipa: 'bɔ̃.swaʁ', pos: 'expresion', band: 1,
    example: { fr: 'Bonsoir, monsieur.', es: 'Buenas noches, señor.' },
    grammar: 'Saludo de la tarde-noche (también sirve para despedirse). Al despedirte también se dice «bonne soirée»; «bonne nuit» solo al ir a dormir.',
    phon: NASAL,
    assoc: { type: 'semantica', story: 'bon (bueno) + soir (tarde-noche) = «buena noche». La luna saluda al llegar.', scene: { main: '🌙', prop: '👋', action: 'ninguna' } }
  },
  {
    id: 'salut', unit: 1, lesson: 1, fr: 'salut', es: 'hola / adiós (informal)',
    esAccept: ['hola', 'adios', 'que onda', 'hola adios'],
    ipa: 'sa.ly', pos: 'expresion', band: 1,
    example: { fr: 'Salut, Marie ! Ça va ?', es: '¡Hola, Marie! ¿Qué tal?' },
    grammar: 'Informal: solo con amigos o familia. Sirve para llegar y para irte. La «t» final no suena.',
    phon: Y_SOUND,
    assoc: { type: 'protegida', story: 'Pista de significado (no de sonido): «salut» se parece a «saludo». Cuida la vocal final [y].', scene: { main: '🙋', action: 'ninguna' } }
  },
  {
    id: 'au-revoir', unit: 1, lesson: 1, fr: 'au revoir', es: 'adiós / hasta luego',
    esAccept: ['adios', 'hasta luego', 'hasta la vista', 'nos vemos'],
    ipa: 'o.ʁə.vwaʁ', pos: 'expresion', band: 1,
    example: { fr: 'Au revoir et merci !', es: '¡Adiós y gracias!' },
    grammar: 'Despedida neutra, válida en cualquier situación.',
    phon: '«au» suena [o]. La «r» francesa se hace al fondo de la garganta, como una «j» suave sonora.',
    assoc: { type: 'semantica', story: 're-voir = volver a ver: «hasta volvernos a ver». Alguien se despide y mira hacia atrás.', scene: { main: '👋', prop: '👀', action: 'ninguna' } }
  },
  {
    id: 'merci', unit: 1, lesson: 1, fr: 'merci', es: 'gracias',
    esAccept: ['gracias'],
    ipa: 'mɛʁ.si', pos: 'expresion', band: 1,
    example: { fr: 'Merci beaucoup.', es: 'Muchas gracias.' },
    grammar: '«Merci beaucoup» = muchas gracias. Respuesta habitual: «de rien» (de nada).',
    phon: 'Termina en [i], no en «-ced».',
    assoc: { type: 'semantica', story: 'merci ↔ «merced» (mismo origen latino): «a su merced» = gracias. Un caballero recibe un regalo y hace una reverencia.', scene: { main: '🙇', prop: '🎁', action: 'ninguna' } }
  },
  {
    id: 'svp', unit: 1, lesson: 1, fr: "s'il vous plaît", es: 'por favor',
    esAccept: ['por favor'], frAccept: ['sil vous plait', "s'il vous plait"],
    ipa: 'sil.vu.plɛ', pos: 'expresion', band: 1,
    example: { fr: "Un café, s'il vous plaît.", es: 'Un café, por favor.' },
    grammar: 'Forma de cortesía (usted). Con amigos: «s\'il te plaît». Se abrevia SVP.',
    assoc: { type: 'semantica', story: 'Literalmente «si le place (a usted)»: un mesero te ofrece la charola con una sonrisa.', scene: { main: '🤲', prop: '☕', action: 'ninguna' } }
  },
  {
    id: 'pardon', unit: 1, lesson: 1, fr: 'pardon', es: 'perdón',
    esAccept: ['perdon', 'disculpa', 'disculpe', 'perdone'],
    ipa: 'paʁ.dɔ̃', pos: 'expresion', band: 1,
    example: { fr: 'Pardon, madame.', es: 'Perdón, señora.' },
    grammar: 'Para disculparte o para pedir que te repitan algo («Pardon ?»).',
    phon: `Termina en vocal nasal [ɔ̃]: ${NASAL}`,
    assoc: { type: 'directa', story: 'Es casi igual que en español: «perdón». Cuidado con la nasal final.', scene: { main: '🙏', action: 'ninguna' } }
  },
  {
    id: 'oui', unit: 1, lesson: 1, fr: 'oui', es: 'sí',
    esAccept: ['si'],
    ipa: 'wi', pos: 'expresion', band: 1,
    example: { fr: 'Oui, merci.', es: 'Sí, gracias.' },
    phon: 'Empieza directo en [w], sin «g»: [wi].',
    assoc: { type: 'palabra-clave', keyword: 'huí', story: 'Un cerdito feliz asiente con la cabeza y grita «¡HUÍÍ!» cada vez que dice que sí.', scene: { main: '🐷', prop: '✅', action: 'asentir' } }
  },
  {
    id: 'non', unit: 1, lesson: 1, fr: 'non', es: 'no',
    esAccept: ['no'],
    ipa: 'nɔ̃', pos: 'expresion', band: 1,
    example: { fr: 'Non, merci.', es: 'No, gracias.' },
    phon: `No es «non» con n final: ${NASAL}`,
    assoc: { type: 'protegida', story: 'Una persona cruza los brazos: no. Escucha el audio: la «n» final no suena.', scene: { main: '🙅', action: 'temblar' } }
  },

  // ── Lección 2: Presentarte ────────────────────────────────────────────────
  {
    id: 'je-m-appelle', unit: 1, lesson: 2, fr: "je m'appelle", es: 'me llamo',
    esAccept: ['me llamo', 'mi nombre es'], frAccept: ['je mappelle'],
    ipa: 'ʒə.ma.pɛl', pos: 'expresion', band: 1,
    example: { fr: "Je m'appelle Paul.", es: 'Me llamo Paul.' },
    grammar: 'Verbo appeler (llamar). «me» se apostrofa ante vocal: m\'appelle.',
    phon: '«je» tiene schwa [ə], una «e» relajada con labios redondeados.',
    assoc: { type: 'semantica', story: '«appeler» se parece a «apelar» (llamar a alguien): alguien levanta la mano y dice su nombre.', scene: { main: '🙋', prop: '📛', action: 'ninguna' } }
  },
  {
    id: 'je-suis', unit: 1, lesson: 2, fr: 'je suis', es: 'soy / estoy',
    esAccept: ['soy', 'estoy', 'yo soy', 'yo estoy', 'soy estoy'],
    ipa: 'ʒə.sɥi', pos: 'expresion', band: 1,
    example: { fr: 'Je suis avocat.', es: 'Soy abogado.' },
    grammar: 'Verbo être (ser y estar a la vez). Con profesiones no se usa artículo: «je suis avocat».',
    phon: '«ui» se dice [ɥi]: empieza con labios de [y] y desliza rápido hacia «i». Sin pista española.',
    assoc: { type: 'protegida', story: 'Te señalas el pecho: «yo soy». Escucha el deslizamiento [ɥi].', scene: { main: '🧑‍💼', action: 'ninguna' } }
  },
  {
    id: 'enchante', unit: 1, lesson: 2, fr: 'enchanté', es: 'mucho gusto / encantado',
    esAccept: ['mucho gusto', 'encantado', 'encantada', 'un placer'], frAccept: ['enchantee', 'enchantée'],
    ipa: 'ɑ̃.ʃɑ̃.te', pos: 'expresion', band: 1,
    example: { fr: "Enchanté, je m'appelle Paul.", es: 'Mucho gusto, me llamo Paul.' },
    grammar: 'Si quien habla es mujer se escribe «enchantée» (se pronuncia igual).',
    phon: `Dos vocales nasales [ɑ̃]. ${NASAL} «ch» suena [ʃ] («sh»), no «ch» española.`,
    assoc: { type: 'directa', story: 'Cognado: «encantado». Dos personas se dan la mano.', scene: { main: '🤝', action: 'ninguna' } }
  },
  {
    id: 'comment-ca-va', unit: 1, lesson: 2, fr: 'comment ça va ?', es: '¿cómo estás? / ¿qué tal?',
    esAccept: ['como estas', 'que tal', 'como te va', 'como esta', 'como va'], frAccept: ['comment ca va', 'ça va', 'ca va'],
    ipa: 'kɔ.mɑ̃.sa.va', pos: 'expresion', band: 1,
    example: { fr: 'Bonjour Paul, comment ça va ?', es: 'Hola Paul, ¿cómo estás?' },
    grammar: 'Literalmente «¿cómo eso va?». Más corto e informal: «Ça va ?».',
    phon: 'La «t» de comment no suena; «ment» es nasal [mɑ̃].',
    assoc: { type: 'semantica', story: 'comment = cómo, ça = eso, va = va: «¿cómo va eso?». Un amigo levanta el pulgar con duda.', scene: { main: '🤔', prop: '👍', action: 'ninguna' } }
  },
  {
    id: 'ca-va-bien', unit: 1, lesson: 2, fr: 'ça va bien', es: 'estoy bien / va bien',
    esAccept: ['estoy bien', 'va bien', 'bien', 'todo bien'], frAccept: ['ca va bien'],
    ipa: 'sa.va.bjɛ̃', pos: 'expresion', band: 1,
    example: { fr: 'Ça va bien, merci.', es: 'Estoy bien, gracias.' },
    grammar: 'Respuesta a «Comment ça va ?». También «ça va» a secas.',
    phon: `«bien» termina en nasal [ɛ̃]: ${NASAL}`,
    assoc: { type: 'semantica', story: '«eso va bien»: alguien sonríe con el pulgar arriba.', scene: { main: '😊', prop: '👍', action: 'ninguna' } }
  },
  {
    id: 'et-vous', unit: 1, lesson: 2, fr: 'et vous ?', es: '¿y usted?',
    esAccept: ['y usted', 'y ustedes'], frAccept: ['et vous'],
    ipa: 'e.vu', pos: 'expresion', band: 1,
    example: { fr: 'Ça va bien, et vous ?', es: 'Bien, ¿y usted?' },
    grammar: 'vous = usted (y también ustedes). Con amigos: «et toi ?».',
    phon: '«et» = [e]; la «t» no suena. «ou» = [u], como la «u» española.',
    assoc: { type: 'semantica', story: 'et = y, vous = usted. Devuelves la pregunta con la mano abierta.', scene: { main: '🫴', action: 'ninguna' } }
  },
  {
    id: 'excusez-moi', unit: 1, lesson: 2, fr: 'excusez-moi', es: 'disculpe',
    esAccept: ['disculpe', 'disculpa', 'perdone', 'con permiso', 'disculpeme'], frAccept: ['excusez moi'],
    ipa: 'ɛk.sky.ze.mwa', pos: 'expresion', band: 1,
    example: { fr: 'Excusez-moi, où est la gare ?', es: 'Disculpe, ¿dónde está la estación?' },
    grammar: 'Para llamar la atención de alguien con cortesía antes de preguntar.',
    phon: Y_SOUND,
    assoc: { type: 'directa', story: 'Cognado: «excúseme». Alguien levanta la mano para preguntar.', scene: { main: '✋', action: 'ninguna' } }
  },
  {
    id: 'je-ne-comprends-pas', unit: 1, lesson: 2, fr: 'je ne comprends pas', es: 'no entiendo',
    esAccept: ['no entiendo', 'no comprendo', 'yo no entiendo'],
    ipa: 'ʒə.nə.kɔ̃.pʁɑ̃.pa', pos: 'expresion', band: 1,
    example: { fr: 'Pardon, je ne comprends pas.', es: 'Perdón, no entiendo.' },
    grammar: 'Negación doble: ne + verbo + pas. En el habla rápida a veces se omite «ne».',
    phon: `Dos nasales: [kɔ̃] y [pʁɑ̃]. ${NASAL}`,
    assoc: { type: 'semantica', story: '«yo no comprendo»: «ne…pas» abraza al verbo. Signos de interrogación giran sobre una cabeza.', scene: { main: '😵‍💫', prop: '❓', action: 'girar' } }
  },
  {
    id: 'j-ai', unit: 1, lesson: 2, fr: "j'ai", es: 'tengo',
    esAccept: ['tengo', 'yo tengo'], frAccept: ['jai'],
    ipa: 'ʒe', pos: 'verbo', band: 1,
    example: { fr: "J'ai un chat.", es: 'Tengo un gato.' },
    grammar: 'Verbo avoir (tener). «je» + vocal = j\'. También es auxiliar del pasado («j\'ai mangé»).',
    assoc: { type: 'semantica', story: 'Tus manos sostienen algo que es tuyo: «tengo».', scene: { main: '🫴', prop: '🎁', action: 'ninguna' } }
  },

  // ── Lección 3: En el café ─────────────────────────────────────────────────
  {
    id: 'cafe', unit: 1, lesson: 3, fr: 'café', article: 'le', gender: 'm', es: 'el café',
    esAccept: ['cafe', 'el cafe', 'cafeteria'],
    ipa: 'lə.ka.fe', pos: 'sustantivo', band: 1,
    example: { fr: 'Je voudrais un café.', es: 'Quisiera un café.' },
    grammar: 'Masculino, como en español. «un café» suele ser un expreso.',
    assoc: { type: 'directa', story: 'Cognado: una taza de café humeante.', scene: { main: '☕', action: 'ninguna' } }
  },
  {
    id: 'eau', unit: 1, lesson: 3, fr: 'eau', article: "l'", gender: 'f', es: 'el agua',
    esAccept: ['agua', 'el agua'],
    ipa: 'lo', pos: 'sustantivo', band: 1,
    example: { fr: "Je voudrais de l'eau.", es: 'Quisiera agua.' },
    grammar: 'Femenino, igual que en español («el agua fría»); en francés el artículo se apostrofa: la + eau → l\'eau. Agua sin cantidad: «de l\'eau» (partitivo).',
    phon: '«eau» se pronuncia solo [o]. Tres letras, un sonido.',
    assoc: { type: 'palabra-clave', keyword: 'lo', story: 'Una gota de agua gigante en el ala fresca (femenina) grita «¡LO tengo!» y salpica todo.', scene: { main: '💧', prop: '🧊', action: 'rebotar' } }
  },
  {
    id: 'pain', unit: 1, lesson: 3, fr: 'pain', article: 'le', gender: 'm', es: 'el pan',
    esAccept: ['pan', 'el pan'],
    ipa: 'lə.pɛ̃', pos: 'sustantivo', band: 1,
    example: { fr: 'Le pain est bon.', es: 'El pan está rico.' },
    grammar: 'Masculino, como en español.',
    phon: `NO se dice «pan»: es [pɛ̃], vocal nasal parecida a una «e» abierta nasal. ${NASAL}`,
    assoc: { type: 'protegida', story: 'Una baguette dorada junto a la chimenea del ala cálida (masculina). Sin pista española para proteger la nasal.', scene: { main: '🥖', prop: '🔥', action: 'ninguna' } }
  },
  {
    id: 'lait', unit: 1, lesson: 3, fr: 'lait', article: 'le', gender: 'm', es: 'la leche',
    esAccept: ['leche', 'la leche'],
    ipa: 'lə.lɛ', pos: 'sustantivo', band: 1,
    example: { fr: "Un café au lait, s'il vous plaît.", es: 'Un café con leche, por favor.' },
    grammar: 'MASCULINO en francés (en español es femenino). «au lait» = à + le lait.',
    phon: '«ai» suena [ɛ], una «e» abierta. La «t» final no suena.',
    assoc: { type: 'semantica', story: 'lait → «lácteo». Un cartón de leche toma el sol junto a la chimenea del ala cálida (masculina).', scene: { main: '🥛', prop: '🔥', action: 'flotar' } }
  },
  {
    id: 'pomme', unit: 1, lesson: 3, fr: 'pomme', article: 'la', gender: 'f', es: 'la manzana',
    esAccept: ['manzana', 'la manzana'],
    ipa: 'la.pɔm', pos: 'sustantivo', band: 1,
    example: { fr: 'La pomme est rouge.', es: 'La manzana es roja.' },
    grammar: 'Femenino, como en español. «pomme de terre» = papa.',
    phon: '[ɔ] es una «o» abierta y corta; la «e» final no suena. Sin vocal final: [pɔm], no «pomo».',
    assoc: { type: 'palabra-clave', keyword: 'pomo', story: 'Una manzana gigante es el POMO de la puerta: cuando la giras, rueda por la habitación gritando «pomme!».', scene: { main: '🍎', prop: '🚪', action: 'rodar' } }
  },
  {
    id: 'je-voudrais', unit: 1, lesson: 3, fr: 'je voudrais', es: 'quisiera / me gustaría',
    esAccept: ['quisiera', 'me gustaria', 'yo quisiera'],
    ipa: 'ʒə.vu.dʁɛ', pos: 'verbo', band: 1,
    example: { fr: 'Je voudrais un café.', es: 'Quisiera un café.' },
    grammar: 'Condicional de vouloir (querer). Es la forma cortés de pedir algo.',
    phon: '«ou» = [u]; «ais» final = [ɛ]. La «s» no suena.',
    assoc: { type: 'semantica', story: 'vouloir → «voluntad»: señalas con amabilidad lo que quieres en el mostrador.', scene: { main: '👉', prop: '🥐', action: 'ninguna' } }
  },
  {
    id: 'addition', unit: 1, lesson: 3, fr: 'addition', article: "l'", gender: 'f', es: 'la cuenta (en el restaurante)',
    esAccept: ['la cuenta', 'cuenta'],
    ipa: 'la.di.sjɔ̃', pos: 'sustantivo', band: 1,
    example: { fr: "L'addition, s'il vous plaît.", es: 'La cuenta, por favor.' },
    grammar: 'Femenino. En el restaurante es «la cuenta»; en matemáticas, «la suma».',
    phon: `«-tion» se dice [sjɔ̃], con nasal final. ${NASAL}`,
    assoc: { type: 'semantica', story: '«adición»: la cuenta es la suma de todo lo que comiste. El ticket se alarga solo.', scene: { main: '🧾', prop: '➕', action: 'crecer' } }
  },
  {
    id: 'combien', unit: 1, lesson: 3, fr: 'combien ?', es: '¿cuánto?',
    esAccept: ['cuanto', 'cuanto cuesta', 'cuanto es'], frAccept: ['combien', "c'est combien", 'cest combien'],
    ipa: 'kɔ̃.bjɛ̃', pos: 'adverbio', band: 1,
    example: { fr: "C'est combien ?", es: '¿Cuánto cuesta?' },
    grammar: '«C\'est combien ?» = ¿cuánto es? «Combien de… ?» = ¿cuántos…?',
    phon: `Dos nasales: [kɔ̃] y [bjɛ̃]. ${NASAL}`,
    assoc: { type: 'protegida', story: 'Una etiqueta de precio con signo de pregunta. Escucha las dos nasales.', scene: { main: '🏷️', prop: '❓', action: 'ninguna' } }
  },

  // ── Lección 4: Personas y cosas ───────────────────────────────────────────
  {
    id: 'ami', unit: 1, lesson: 4, fr: 'ami', article: "l'", gender: 'm', es: 'el amigo',
    esAccept: ['amigo', 'el amigo'],
    frAccept: ['un ami'],
    ipa: 'la.mi', pos: 'sustantivo', band: 1,
    example: { fr: "C'est mon ami Paul.", es: 'Es mi amigo Paul.' },
    grammar: 'Femenino: «une amie» (se pronuncia igual). Ante vocal se dice «mon amie», no «ma».',
    assoc: { type: 'directa', story: 'Cognado: «amigo». Dos amigos se abrazan.', scene: { main: '🫂', action: 'ninguna' } }
  },
  {
    id: 'femme', unit: 1, lesson: 4, fr: 'femme', article: 'la', gender: 'f', es: 'la mujer / la esposa',
    esAccept: ['mujer', 'la mujer', 'esposa', 'la esposa'],
    ipa: 'la.fam', pos: 'sustantivo', band: 1,
    example: { fr: 'La femme parle français.', es: 'La mujer habla francés.' },
    grammar: '«ma femme» = mi esposa.',
    phon: 'Ojo: se escribe «emme» pero se pronuncia [am]. Sin vocal final: [fam], no «fama».',
    assoc: { type: 'palabra-clave', keyword: 'fama', story: 'Una mujer camina por la alfombra roja: ¡tiene FAMA! Los flashes estallan a su paso.', scene: { main: '👩', prop: '⭐', action: 'flotar' } }
  },
  {
    id: 'homme', unit: 1, lesson: 4, fr: 'homme', article: "l'", gender: 'm', es: 'el hombre',
    esAccept: ['hombre', 'el hombre'],
    ipa: 'lɔm', pos: 'sustantivo', band: 1,
    example: { fr: "L'homme mange une pomme.", es: 'El hombre come una manzana.' },
    grammar: 'La «h» es muda, por eso «l\'homme».',
    assoc: { type: 'directa', story: 'Pariente de «hombre». Un hombre de pie.', scene: { main: '👨', action: 'ninguna' } }
  },
  {
    id: 'chat', unit: 1, lesson: 4, fr: 'chat', article: 'le', gender: 'm', es: 'el gato',
    esAccept: ['gato', 'el gato'],
    ipa: 'lə.ʃa', pos: 'sustantivo', band: 1,
    example: { fr: 'Le chat aime le lait.', es: 'Al gato le gusta la leche.' },
    grammar: 'Hembra: «la chatte» (evítala; en registro coloquial tiene doble sentido). Usa «le chat».',
    phon: '«ch» = [ʃ] («sh»). La «t» final no suena.',
    assoc: { type: 'palabra-clave', keyword: 'shh', story: 'Un gato se lleva la pata a la boca y te hace «¡SHHH-a!» para que no lo despiertes.', scene: { main: '🐱', prop: '🤫', action: 'temblar' } }
  },
  {
    id: 'chien', unit: 1, lesson: 4, fr: 'chien', article: 'le', gender: 'm', es: 'el perro',
    esAccept: ['perro', 'el perro'],
    ipa: 'lə.ʃjɛ̃', pos: 'sustantivo', band: 1,
    example: { fr: "J'ai un chien.", es: 'Tengo un perro.' },
    phon: `[ʃjɛ̃]: «sh» + «i» + nasal. ${NASAL}`,
    assoc: { type: 'protegida', story: 'Un perro mueve la cola en el ala cálida (masculina). Escucha la nasal final.', scene: { main: '🐶', action: 'rebotar' } }
  },
  {
    id: 'maison', unit: 1, lesson: 4, fr: 'maison', article: 'la', gender: 'f', es: 'la casa',
    esAccept: ['casa', 'la casa', 'hogar'],
    ipa: 'la.mɛ.zɔ̃', pos: 'sustantivo', band: 1,
    example: { fr: 'La maison est grande.', es: 'La casa es grande.' },
    grammar: '«à la maison» = en casa.',
    phon: `La «s» entre vocales suena [z]. Final nasal [ɔ̃]. ${NASAL}`,
    assoc: { type: 'semantica', story: 'Pista de significado (no de sonido): «maison» ↔ «mansión». Una casa con jardín fresco.', scene: { main: '🏡', action: 'ninguna' } }
  },
  {
    id: 'voiture', unit: 1, lesson: 4, fr: 'voiture', article: 'la', gender: 'f', es: 'el coche / el carro',
    esAccept: ['coche', 'el coche', 'carro', 'el carro', 'auto', 'el auto', 'automovil'],
    ipa: 'la.vwa.tyʁ', pos: 'sustantivo', band: 1,
    example: { fr: 'La voiture est rouge.', es: 'El carro es rojo.' },
    grammar: 'FEMENINO en francés (en español es masculino).',
    phon: Y_SOUND,
    assoc: { type: 'protegida', story: 'Un carro nada entre peces en la pecera del ala fresca (femenina): ¡es «la» voiture!', scene: { main: '🚗', prop: '🐟', action: 'flotar' } }
  },
  {
    id: 'livre', unit: 1, lesson: 4, fr: 'livre', article: 'le', gender: 'm', es: 'el libro',
    esAccept: ['libro', 'el libro'],
    ipa: 'lə.livʁ', pos: 'sustantivo', band: 1,
    example: { fr: "J'aime le livre.", es: 'Me gusta el libro.' },
    grammar: 'Ojo: «la livre» (femenino) es la libra (peso o moneda).',
    assoc: { type: 'directa', story: 'Cognado: «libro». Un libro abierto.', scene: { main: '📖', action: 'ninguna' } }
  },
  {
    id: 'table', unit: 1, lesson: 4, fr: 'table', article: 'la', gender: 'f', es: 'la mesa',
    esAccept: ['mesa', 'la mesa'],
    ipa: 'la.tabl', pos: 'sustantivo', band: 1,
    example: { fr: 'Le livre est sur la table.', es: 'El libro está sobre la mesa.' },
    grammar: '«À table !» = ¡a comer!',
    assoc: { type: 'directa', story: 'Pariente de «tabla»: una mesa hecha de una tabla.', scene: { main: '🪵', action: 'ninguna' } }
  },

  // ── Lección 5: Moverte por la ciudad ──────────────────────────────────────
  {
    id: 'train', unit: 1, lesson: 5, fr: 'train', article: 'le', gender: 'm', es: 'el tren',
    esAccept: ['tren', 'el tren'],
    ipa: 'lə.tʁɛ̃', pos: 'sustantivo', band: 1,
    example: { fr: 'Le train est à la gare.', es: 'El tren está en la estación.' },
    phon: `Final nasal [ɛ̃], no «tren». ${NASAL}`,
    assoc: { type: 'directa', story: 'Cognado: «tren». Escucha la nasal.', scene: { main: '🚆', action: 'ninguna' } }
  },
  {
    id: 'gare', unit: 1, lesson: 5, fr: 'gare', article: 'la', gender: 'f', es: 'la estación (de tren)',
    esAccept: ['estacion', 'la estacion', 'estacion de tren', 'la estacion de tren'],
    ipa: 'la.ɡaʁ', pos: 'sustantivo', band: 1,
    example: { fr: 'Où est la gare ?', es: '¿Dónde está la estación?' },
    grammar: 'Estación de tren. La del metro es «la station».',
    phon: 'No es «garra»: una sola sílaba [ɡaʁ], la «r» es uvular (al fondo de la garganta) y no hay vocal final.',
    assoc: { type: 'palabra-clave', keyword: 'garra', story: 'Una GARRA de águila gigante baja del cielo y atrapa los trenes que llegan a la estación.', scene: { main: '🚉', prop: '🦅', action: 'temblar' } }
  },
  {
    id: 'ou', unit: 1, lesson: 5, fr: 'où', es: '¿dónde?',
    esAccept: ['donde', 'a donde', 'adonde'], frAccept: ['où ?'],
    ipa: 'u', pos: 'adverbio', band: 1,
    example: { fr: 'Où est le chat ?', es: '¿Dónde está el gato?' },
    grammar: '«où» (con acento) = dónde; «ou» (sin acento) = o. Suenan igual.',
    assoc: { type: 'palabra-clave', keyword: 'uh', story: 'Un búho perdido gira la cabeza: «¿UUU-dónde estoy?».', scene: { main: '🦉', prop: '🗺️', action: 'girar' } }
  },
  {
    id: 'toilettes', unit: 1, lesson: 5, fr: 'toilettes', article: 'les', gender: 'f', es: 'el baño (público)',
    esAccept: ['bano', 'el bano', 'banos', 'los banos', 'sanitario', 'servicios', 'el sanitario'],
    ipa: 'le.twa.lɛt', pos: 'sustantivo', band: 1,
    example: { fr: 'Où sont les toilettes ?', es: '¿Dónde está el baño?' },
    grammar: 'Siempre en plural en este sentido: «les toilettes», por eso «où sont…».',
    phon: '«oi» = [wa].',
    assoc: { type: 'directa', story: 'Como «toilet»: el letrero del baño.', scene: { main: '🚻', action: 'ninguna' } }
  },
  {
    id: 'aujourdhui', unit: 1, lesson: 5, fr: "aujourd'hui", es: 'hoy',
    esAccept: ['hoy'], frAccept: ['aujourdhui'],
    ipa: 'o.ʒuʁ.dɥi', pos: 'adverbio', band: 1,
    example: { fr: "Aujourd'hui, je parle français.", es: 'Hoy hablo francés.' },
    grammar: 'Literalmente «en el día de hoy» (hui viene del latín hodie, como «hoy»).',
    phon: '«hui» = [ɥi]: labios de [y] deslizando a «i».',
    assoc: { type: 'semantica', story: 'au jour d\'hui = «al día de hoy»: el calendario muestra la fecha de hoy marcada.', scene: { main: '📅', prop: '📍', action: 'ninguna' } }
  },
  {
    id: 'demain', unit: 1, lesson: 5, fr: 'demain', es: 'mañana (el día siguiente)',
    esAccept: ['manana', 'el dia de manana'],
    ipa: 'də.mɛ̃', pos: 'adverbio', band: 1,
    example: { fr: 'À demain !', es: '¡Hasta mañana!' },
    grammar: '«demain» = el día siguiente. «le matin» = la mañana (parte del día).',
    phon: `Final nasal [ɛ̃]. ${NASAL}`,
    assoc: { type: 'protegida', story: 'Un despertador suena al día siguiente. Escucha la nasal final.', scene: { main: '⏰', action: 'temblar' } }
  },
  {
    id: 'parler', unit: 1, lesson: 5, fr: 'parler', es: 'hablar',
    esAccept: ['hablar'],
    ipa: 'paʁ.le', pos: 'verbo', band: 1,
    example: { fr: 'Je parle espagnol.', es: 'Hablo español.' },
    grammar: 'Verbo regular en -er: je parle, tu parles, il parle (las tres suenan igual [paʁl]).',
    phon: '«-er» final = [e]; la «r» no suena.',
    assoc: { type: 'semantica', story: 'parler → «parlotear», «parlamento»: un globo de diálogo sale de una boca.', scene: { main: '🗣️', prop: '💬', action: 'ninguna' } }
  },
  {
    id: 'manger', unit: 1, lesson: 5, fr: 'manger', es: 'comer',
    esAccept: ['comer'],
    ipa: 'mɑ̃.ʒe', pos: 'verbo', band: 1,
    example: { fr: 'Je mange une pomme.', es: 'Como una manzana.' },
    grammar: 'Regular en -er, con una particularidad: «nous mangeons» (conserva la e).',
    phon: `Pista de significado «manjar», pero ojo: [mɑ̃] es nasal, sin «n». ${NASAL}`,
    assoc: { type: 'semantica', story: 'manger → «manjar»: alguien devora un plato con cubiertos.', scene: { main: '🍽️', prop: '😋', action: 'ninguna' } }
  },
  {
    id: 'aimer', unit: 1, lesson: 5, fr: 'aimer', es: 'amar / gustar',
    esAccept: ['amar', 'gustar', 'querer'],
    ipa: 'e.me', pos: 'verbo', band: 1,
    example: { fr: "J'aime le café.", es: 'Me gusta el café.' },
    grammar: 'Sirve para «amar» y «gustar». Con cosas: «j\'aime le café» (con artículo definido).',
    assoc: { type: 'directa', story: 'Pariente de «amar»: un corazón.', scene: { main: '❤️', action: 'crecer' } }
  },

  // ── Lección 6: Números y verbos clave ─────────────────────────────────────
  {
    id: 'un', unit: 1, lesson: 6, fr: 'un', es: 'uno / un',
    esAccept: ['uno', 'un', '1'], frAccept: ['1'],
    ipa: 'œ̃', pos: 'numero', band: 1,
    example: { fr: "J'ai un livre.", es: 'Tengo un libro.' },
    grammar: 'Femenino: «une». Muchos francófonos lo pronuncian [ɛ̃].',
    phon: `Vocal nasal. ${NASAL}`,
    assoc: { type: 'protegida', story: 'El primer escalón de la escalera de los números.', scene: { main: '1️⃣', action: 'ninguna' } }
  },
  {
    id: 'deux', unit: 1, lesson: 6, fr: 'deux', es: 'dos',
    esAccept: ['dos', '2'], frAccept: ['2'],
    ipa: 'dø', pos: 'numero', band: 1,
    example: { fr: "Deux cafés, s'il vous plaît.", es: 'Dos cafés, por favor.' },
    phon: '[ø]: labios redondeados de «o» diciendo «e». No existe en español.',
    assoc: { type: 'protegida', story: 'Segundo escalón. Escucha la vocal [ø].', scene: { main: '2️⃣', action: 'ninguna' } }
  },
  {
    id: 'trois', unit: 1, lesson: 6, fr: 'trois', es: 'tres',
    esAccept: ['tres', '3'], frAccept: ['3'],
    ipa: 'tʁwa', pos: 'numero', band: 1,
    example: { fr: "J'ai trois chats.", es: 'Tengo tres gatos.' },
    phon: '«oi» = [wa]; la «s» no suena.',
    assoc: { type: 'directa', story: 'Tercer escalón.', scene: { main: '3️⃣', action: 'ninguna' } }
  },
  {
    id: 'quatre', unit: 1, lesson: 6, fr: 'quatre', es: 'cuatro',
    esAccept: ['cuatro', '4'], frAccept: ['4'],
    ipa: 'katʁ', pos: 'numero', band: 1,
    example: { fr: "Quatre pommes, s'il vous plaît.", es: 'Cuatro manzanas, por favor.' },
    phon: '«qu» = [k]. La «e» final no suena.',
    assoc: { type: 'directa', story: 'Cuarto escalón.', scene: { main: '4️⃣', action: 'ninguna' } }
  },
  {
    id: 'cinq', unit: 1, lesson: 6, fr: 'cinq', es: 'cinco',
    esAccept: ['cinco', '5'], frAccept: ['5'],
    ipa: 'sɛ̃k', pos: 'numero', band: 1,
    example: { fr: 'Cinq euros, monsieur.', es: 'Cinco euros, señor.' },
    phon: `Nasal [ɛ̃] + [k]. ${NASAL}`,
    assoc: { type: 'protegida', story: 'Quinto escalón: llegaste arriba.', scene: { main: '5️⃣', action: 'ninguna' } }
  },
  {
    id: 'etre', unit: 1, lesson: 6, fr: 'être', es: 'ser / estar',
    esAccept: ['ser', 'estar', 'ser estar'], frAccept: ['etre'],
    ipa: 'ɛtʁ', pos: 'verbo', band: 1,
    example: { fr: 'Je suis à Paris.', es: 'Estoy en París.' },
    grammar: 'Presente: je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont. Un solo verbo para «ser» y «estar».',
    phon: '«ê» = [ɛ], «e» abierta.',
    assoc: { type: 'semantica', story: 'Un solo verbo para dos del español: una persona de pie (ser) en un lugar (estar).', scene: { main: '🧍', prop: '📍', action: 'ninguna' } }
  },
  {
    id: 'avoir', unit: 1, lesson: 6, fr: 'avoir', es: 'tener',
    esAccept: ['tener', 'haber'],
    ipa: 'a.vwaʁ', pos: 'verbo', band: 1,
    example: { fr: 'Nous avons une maison.', es: 'Tenemos una casa.' },
    grammar: 'Presente: j\'ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont. También forma el pasado compuesto.',
    assoc: { type: 'semantica', story: 'avoir ↔ «haber» (mismo origen latino): unas manos llenas de cosas propias.', scene: { main: '🙌', prop: '🎒', action: 'ninguna' } }
  }
];
