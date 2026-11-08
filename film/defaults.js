/* Categorie predefinite (standard Movie Magic + aggiunte italiane). Ogni progetto le può cambiare. */
const DEFAULT_CATS = [
  {k:"cast",   l:"Cast",                        c:"#e5202a", on:true, fixed:true},
  {k:"figs",   l:"Figurazioni speciali",        c:"#e8890c", on:true},
  {k:"extra",  l:"Comparse",                    c:"#2f9e44", on:true},
  {k:"stunt",  l:"Stunt",                       c:"#c2410c", on:true},
  {k:"veic",   l:"Veicoli",                     c:"#db2777", on:true},
  {k:"anim",   l:"Animali",                     c:"#a16207", on:true},
  {k:"props",  l:"Attrezzeria",                 c:"#7c3aed", on:true},
  {k:"set",    l:"Scenografia e arredo",        c:"#0f766e", on:true},
  {k:"cost",   l:"Costumi",                     c:"#2563eb", on:true},
  {k:"mua",    l:"Trucco e acconciature",       c:"#be185d", on:true},
  {k:"sfx",    l:"Effetti speciali",            c:"#0891b2", on:true},
  {k:"vfx",    l:"Effetti visivi",              c:"#4f46e5", on:true},
  {k:"arms",   l:"Armi di scena",               c:"#57534e", on:true},
  {k:"sound",  l:"Suono",                       c:"#78716c", on:true},
  {k:"music",  l:"Musica",                      c:"#9333ea", on:true},
  {k:"equip",  l:"Attrezzature speciali",       c:"#475569", on:true},
  {k:"perm",   l:"Location e permessi",         c:"#15803d", on:true},
  {k:"minor",  l:"Minori sul set",              c:"#d97706", on:true},
  {k:"note",   l:"Note di produzione",          c:"#64748b", on:true}
];

/* Spoglio a regole (gratuito): dizionario per categoria. La versione finale ha un dizionario per lingua. */
const RULES = {
  veic:  ["jeep","bicicletta","barca a remi","auto","furgone","corriera","trattore"],
  anim:  ["gregge di pecore","cane","pecore"],
  props: ["thermos","radio","registro cartaceo","penna","fotografia","quaderno","pane","sacchetto della spesa","telefono","torcia","lanterna a petrolio","estintore","coperta termica","grappe","bastone","puntina","faro di bicicletta"],
  set:   ["monitor","armadietto","stufa a legna","credenza","bancarelle","banco di frittelle","luci colorate","bancone","tv","ruota dello scarico","quadro elettrico","parapetto"],
  cost:  ["giacca impermeabile rossa","giacca impermeabile","cappuccio"],
  sfx:   ["pioggia battente","pioggia leggera","pioggia","vento forte","nebbia","fumo","allarme giallo","sirena","boato"],
  sound: ["radio alla cintura gracchia","tuono","abbaia","boato sordo","notiziario"],
  music: ["banda musicale","marcia"],
  extra: ["trentina di compaesani","otto avventori","compaesani","avventori"],
  stunt: ["slitta","cade, scivola"],
  equip: ["drone","gru","steadicam"]
};

/* Mezzi e autisti d'esempio, con gli stessi nomi usati in Set Transport */
const TRANSPORT_DEFAULT = {
  base: "Hotel Lago Blu",
  camp: "Camp Base - Parcheggio diga",
  drivers: [["Alexander Denzer","Prod. Van 3"],["Felix Maul","Camera Van 1"],["Martin Alan","TAXI"]]
};
