export const TOPICS = [
  { id: 'vitesse', label: 'Limitations de vitesse', icon: '🚗' },
  { id: 'signalisation', label: 'Signalisation', icon: '🚦' },
  { id: 'priorite', label: 'Priorités', icon: '⚠️' },
  { id: 'alcool', label: 'Alcool & drogues', icon: '🍺' },
  { id: 'permis', label: 'Permis probatoire', icon: '📄' },
  { id: 'autoroute', label: 'Autoroute', icon: '🛣️' },
  { id: 'stationnement', label: 'Stationnement', icon: '🅿️' },
  { id: 'securite', label: 'Sécurité passive', icon: '🦺' },
  { id: 'premiers_secours', label: 'Premiers secours', icon: '🚑' },
] as const;

export const PREMIUM_TOPICS = [
  { id: 'eco', label: 'Éco-conduite', icon: '🌱' },
  { id: 'moto', label: 'Moto', icon: '🏍️' },
  { id: 'nuit', label: 'Conduite de nuit', icon: '🌙' },
] as const;

export const TIPS = [
  { title: '🛣️ Autoroute', content: '130 km/h sec · 110 km/h pluie · 50 km/h brouillard < 50m.' },
  { title: '⚠️ Priorité à droite', content: 'Sans signalisation : toujours céder le passage à droite.' },
  { title: '📏 Distance de sécurité', content: 'Minimum 2 secondes avec le véhicule devant.' },
  { title: '🍺 Alcool', content: 'Max 0,5 g/L · 0,2 g/L en période probatoire.' },
  { title: '💡 Feux de croisement', content: 'Obligatoires la nuit, en tunnel, sous la pluie.' },
  { title: '📱 Téléphone', content: 'Interdit en main. 135€ + 3 points.' },
  { title: '🌱 Éco-conduite', content: 'Anticipez les freinages, roulez en régime optimal.' },
  { title: '🅿️ Stationnement', content: '5m avant un passage piéton, 12m avant un arrêt de bus.' },
];

export const POSITIONING_QUESTIONS = [
  { q: "Vitesse max sur autoroute par temps sec ?", choices: ["110 km/h", "130 km/h", "150 km/h", "120 km/h"], answer: 1, topic: "vitesse" },
  { q: "Carrefour sans signalisation, qui a la priorité ?", choices: ["Gauche", "Droite", "Premier arrivé", "Tout droit"], answer: 1, topic: "priorite" },
  { q: "Alcoolémie max jeune conducteur ?", choices: ["0,5 g/L", "0,2 g/L", "0,8 g/L", "0 g/L"], answer: 1, topic: "alcool" },
  { q: "Panneau rond à fond bleu signifie ?", choices: ["Interdiction", "Obligation", "Indication", "Danger"], answer: 1, topic: "signalisation" },
  { q: "Distance de sécurité minimum ?", choices: ["1 seconde", "2 secondes", "3 secondes", "4 secondes"], answer: 1, topic: "vitesse" },
  { q: "Points au départ en probatoire ?", choices: ["12", "6", "8", "10"], answer: 1, topic: "permis" },
  { q: "Interdit de stationner sur ?", choices: ["Un trottoir", "Zone bleue", "3m d'un passage piéton", "Les trois"], answer: 0, topic: "stationnement" },
  { q: "Premier geste sur un lieu d'accident ?", choices: ["Appeler", "Protéger", "Secourir", "Déplacer"], answer: 1, topic: "premiers_secours" },
  { q: "Vitesse max autoroute sous la pluie ?", choices: ["110 km/h", "130 km/h", "100 km/h", "90 km/h"], answer: 0, topic: "autoroute" },
  { q: "Ceinture obligatoire à l'arrière ?", choices: ["Oui toujours", "Non", "Autoroute seulement", "Enfants seulement"], answer: 0, topic: "securite" },
];

export const PLAN_30_DAYS = [
  { day: 1, topic: "signalisation", title: "Panneaux d'interdiction", type: "qcm" as const },
  { day: 2, topic: "signalisation", title: "Panneaux d'obligation", type: "qcm" as const },
  { day: 3, topic: "signalisation", title: "Panneaux de danger", type: "qcm" as const },
  { day: 4, topic: "vitesse", title: "Limitations de vitesse", type: "qcm" as const },
  { day: 5, topic: "vitesse", title: "Distances de freinage", type: "qcm" as const },
  { day: 6, topic: "priorite", title: "Priorité à droite", type: "qcm" as const },
  { day: 7, topic: "priorite", title: "Ronds-points", type: "qcm" as const },
  { day: 8, topic: "signalisation", title: "Feux & marquages", type: "revision" as const },
  { day: 9, topic: "alcool", title: "Alcool & stupéfiants", type: "qcm" as const },
  { day: 10, topic: "alcool", title: "Sanctions alcool", type: "qcm" as const },
  { day: 11, topic: "permis", title: "Permis probatoire", type: "qcm" as const },
  { day: 12, topic: "permis", title: "Points & infractions", type: "qcm" as const },
  { day: 13, topic: "securite", title: "Ceinture & airbags", type: "qcm" as const },
  { day: 14, topic: "securite", title: "Sécurité enfants", type: "qcm" as const },
  { day: 15, topic: "mix", title: "Examen blanc #1", type: "exam" as const },
  { day: 16, topic: "autoroute", title: "Conduite autoroute", type: "qcm" as const },
  { day: 17, topic: "autoroute", title: "Insertion & dépassement", type: "qcm" as const },
  { day: 18, topic: "stationnement", title: "Règles stationnement", type: "qcm" as const },
  { day: 19, topic: "stationnement", title: "Arrêt & stationnement", type: "qcm" as const },
  { day: 20, topic: "premiers_secours", title: "Gestes qui sauvent", type: "qcm" as const },
  { day: 21, topic: "premiers_secours", title: "Alerter les secours", type: "qcm" as const },
  { day: 22, topic: "eco", title: "Éco-conduite", type: "qcm" as const },
  { day: 23, topic: "mix", title: "Révision points faibles", type: "revision" as const },
  { day: 24, topic: "nuit", title: "Conduite de nuit", type: "qcm" as const },
  { day: 25, topic: "mix", title: "Examen blanc #2", type: "exam" as const },
  { day: 26, topic: "signalisation", title: "Révision panneaux", type: "vision" as const },
  { day: 27, topic: "mix", title: "QCM intensif mixte", type: "qcm" as const },
  { day: 28, topic: "mix", title: "Points faibles ciblés", type: "revision" as const },
  { day: 29, topic: "mix", title: "Examen blanc final", type: "exam" as const },
  { day: 30, topic: "mix", title: "Dernier check-up", type: "revision" as const },
];
