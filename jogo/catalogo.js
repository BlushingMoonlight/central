// Central — o catálogo do jogo (DEC-150, DEC-176): cada modelo de item como dado (a pegada, a altura na parede, a luz, o
// inventário, onde se senta ou deita, relativo ao item). O construtor põe itens daqui; os menus usam os nomes. A arte de
// cada modelo está em arte.js. Itens novos de verdade vêm da fábrica de itens (a IA gera a arte), não daqui.
export const NOMES = { abajur_chao: 'Abajur', luzinhas: 'Luzinhas', lava: 'Luminária de lava', fita_led: 'Fita de luz', monitor: 'Computador', pendente: 'Luz da cozinha', luz_armario: 'Luz da bancada',
  abajur_mesa: 'Abajur', luminaria_leitura: 'Luminária de leitura', aquario: 'Aquário', tv: 'TV', toca_discos: 'Toca-discos', violao: 'Violão', relogio: 'Relógio', relogio_j: 'Relógio "J"',
  caixa_areia: 'Caixa de areia', potes_gato: 'Potes do gato', geladeira: 'Geladeira', estante: 'Estante', guarda_roupa: 'Guarda-roupa', comoda: 'Cômoda', bancada: 'Despensa', cesto_roupa: 'Cesto de roupa',
  arranhador: 'Arranhador', arvore: 'Árvore', banco: 'Banco', banheira: 'Banheira', cadeira: 'Cadeira', cafeteira: 'Cafeteira', cama: 'Cama', caminha_gato: 'Caminha do gato',
  capacho: 'Capacho', cesto: 'Cesto', chinelos: 'Chinelos', criado: 'Criado-mudo', fogao: 'Fogão', hidrante: 'Hidrante', livros: 'Livros', lixeira: 'Lixeira', manta: 'Manta',
  mesa: 'Mesa', mesa_baixa: 'Mesa de centro', mesa_jantar: 'Mesa de jantar', micro_ondas: 'Micro-ondas', pia: 'Pia', pia_banheiro: 'Pia', planta_grande: 'Planta',
  planta_pendurada: 'Planta', planta_pequena: 'Planta', poltrona: 'Poltrona', poste: 'Poste', prateleira: 'Prateleira', pufe: 'Pufe', quadro: 'Quadro', sofa: 'Sofá',
  tapete: 'Tapete', tapete_redondo: 'Tapete', vasinhos: 'Vasinhos', vaso_sanitario: 'Vaso sanitário', escada: 'Escada', interruptor: 'Interruptor',
  almofada: 'Almofada', caneca: 'Caneca', sapatos: 'Sapatos', vela: 'Vela', cortina: 'Cortina', lareira: 'Lareira', caixa: 'Caixa', porta_vizinho: 'Porta do vizinho', elevador: 'Elevador',
  caixa_correio: 'Caixa de correio', portao: 'Portão' };
export const CATALOGO = [{"grupo": "Luzes", "modelo": "abajur_chao", "w": 0.6, "d": 0.6, "luz": {"cor": "#ffc27a", "raio": 96, "auto": "sala"}},
  {"grupo": "Luzes", "modelo": "abajur_mesa", "w": 0.4, "d": 0.4, "z": 14, "solto": true, "luz": {"cor": "#ffbf73", "raio": 70, "auto": "quarto"}},
  {"grupo": "Luzes", "modelo": "luminaria_leitura", "w": 0.4, "d": 0.4, "luz": {"cor": "#ffd28c", "raio": 60, "auto": "leitura"}},
  {"grupo": "Luzes", "modelo": "luzinhas", "w": 5, "d": 0.2, "z": 40, "parede": "n", "solto": true, "luz": {"cor": "#ffd98a", "raio": 70, "auto": "sala", "rgb": true}},
  {"grupo": "Luzes", "modelo": "lava", "w": 0.4, "d": 0.4, "z": 14, "solto": true, "luz": {"cor": "#ff8a5c", "raio": 40, "auto": "sala", "rgb": true}},
  {"grupo": "Luzes", "modelo": "fita_led", "w": 0.2, "d": 3, "z": 44, "parede": "w", "solto": true, "luz": {"cor": "#ff6fb5", "raio": 60, "auto": "nunca", "rgb": true}},
  {"grupo": "Luzes", "modelo": "pendente", "w": 0.5, "d": 0.5, "z": 70, "solto": true, "luz": {"cor": "#ffc27a", "raio": 80, "auto": "cozinha"}},
  {"grupo": "Luzes", "modelo": "luz_armario", "w": 4, "d": 0.2, "z": 34, "parede": "n", "solto": true, "luz": {"cor": "#ffcf8a", "raio": 50, "auto": "cozinha"}},
  {"grupo": "Luzes", "modelo": "interruptor", "w": 0.2, "d": 0.5, "z": 18, "parede": "w", "solto": true},
  {"grupo": "Sala", "modelo": "sofa", "w": 3, "d": 1, "uso": [{"x": 1.5, "y": 0.5, "pose": "sentada"}]},
  {"grupo": "Sala", "modelo": "manta", "w": 1, "d": 1, "z": 10, "solto": true},
  {"grupo": "Sala", "modelo": "almofada", "w": 0.5, "d": 0.5, "z": 8, "solto": true},
  {"grupo": "Sala", "modelo": "caneca", "w": 0.3, "d": 0.3, "z": 9, "solto": true},
  {"grupo": "Sala", "modelo": "vela", "w": 0.3, "d": 0.3, "z": 9, "solto": true, "luz": {"cor": "#ffb060", "raio": 34, "auto": "sala"}},
  {"grupo": "Sala", "modelo": "cortina", "w": 2, "d": 0.2, "z": 10, "parede": "n", "solto": true},
  {"grupo": "Sala", "modelo": "lareira", "w": 1.6, "d": 0.6, "luz": {"cor": "#ff9a4a", "raio": 80, "auto": "sala"}},
  {"grupo": "Quarto", "modelo": "sapatos", "w": 0.7, "d": 0.5},
  {"grupo": "Sala", "modelo": "tapete", "w": 3, "d": 2, "chao": true},
  {"grupo": "Sala", "modelo": "tapete_redondo", "w": 1.4, "d": 1.4, "chao": true},
  {"grupo": "Sala", "modelo": "mesa_baixa", "w": 1.5, "d": 1},
  {"grupo": "Sala", "modelo": "pufe", "w": 1, "d": 1},
  {"grupo": "Sala", "modelo": "poltrona", "w": 1, "d": 1, "uso": [{"x": 0.5, "y": 0.5, "pose": "sentada"}]},
  {"grupo": "Sala", "modelo": "tv", "w": 2, "d": 0.3, "z": 18, "parede": "n"},
  {"grupo": "Sala", "modelo": "toca_discos", "w": 1, "d": 1},
  {"grupo": "Sala", "modelo": "violao", "w": 0.4, "d": 0.4},
  {"grupo": "Sala", "modelo": "estante", "w": 1, "d": 2, "inventario": true},
  {"grupo": "Sala", "modelo": "livros", "w": 0.6, "d": 0.6},
  {"grupo": "Sala", "modelo": "prateleira", "w": 2.5, "d": 0.3, "z": 46, "parede": "n", "solto": true},
  {"grupo": "Sala", "modelo": "quadro", "w": 0.2, "d": 1, "z": 22, "parede": "w", "solto": true},
  {"grupo": "Sala", "modelo": "relogio", "w": 0.6, "d": 0.2, "z": 30, "parede": "n", "solto": true},
  {"grupo": "Sala", "modelo": "relogio_j", "w": 0.2, "d": 0.6, "z": 30, "parede": "w", "solto": true},
  {"grupo": "Sala", "modelo": "aquario", "w": 1, "d": 1, "luz": {"cor": "#6fd0ff", "raio": 40, "auto": "sempre"}},
  {"grupo": "Sala", "modelo": "planta_grande", "w": 0.8, "d": 0.8},
  {"grupo": "Sala", "modelo": "planta_pequena", "w": 0.5, "d": 0.5},
  {"grupo": "Sala", "modelo": "planta_pendurada", "w": 0.6, "d": 0.4, "z": 40, "parede": "n", "solto": true},
  {"grupo": "Sala", "modelo": "vasinhos", "w": 1.6, "d": 0.3, "z": 20, "parede": "n", "solto": true},
  {"grupo": "Sala", "modelo": "monitor", "w": 0.8, "d": 0.4, "z": 14, "solto": true, "luz": {"cor": "#7fb6ff", "raio": 34, "auto": "trabalho"}},
  {"grupo": "Sala", "modelo": "mesa", "w": 1.6, "d": 1, "uso": [{"x": 0.8, "y": 1.3, "pose": "sentada", "dir": "ne"}]},
  {"grupo": "Sala", "modelo": "cadeira", "w": 0.8, "d": 0.8},
  {"grupo": "Cozinha", "modelo": "geladeira", "w": 0.9, "d": 1, "inventario": true, "uso": [{"x": -0.4, "y": 1.5, "pose": "parada", "dir": "ne"}]},
  {"grupo": "Cozinha", "modelo": "fogao", "w": 1, "d": 1, "uso": [{"x": 0.5, "y": 1.5, "pose": "parada", "dir": "ne"}]},
  {"grupo": "Cozinha", "modelo": "pia", "w": 1.2, "d": 1},
  {"grupo": "Cozinha", "modelo": "bancada", "w": 1.8, "d": 1, "inventario": true},
  {"grupo": "Cozinha", "modelo": "micro_ondas", "w": 0.7, "d": 0.5, "z": 16, "solto": true},
  {"grupo": "Cozinha", "modelo": "cafeteira", "w": 0.4, "d": 0.4, "z": 16, "solto": true},
  {"grupo": "Cozinha", "modelo": "mesa_jantar", "w": 2, "d": 1.4, "uso": [{"x": 0.6, "y": 1.7, "pose": "sentada", "dir": "ne"}]},
  {"grupo": "Cozinha", "modelo": "lixeira", "w": 0.5, "d": 0.5},
  {"grupo": "Quarto", "modelo": "cama", "w": 2.1, "d": 1.8, "uso": [{"x": 1.05, "y": 0.9, "pose": "deitada"}]},
  {"grupo": "Quarto", "modelo": "criado", "w": 0.6, "d": 0.6},
  {"grupo": "Quarto", "modelo": "guarda_roupa", "w": 1.6, "d": 0.8, "inventario": true},
  {"grupo": "Quarto", "modelo": "comoda", "w": 0.8, "d": 0.7, "inventario": true},
  {"grupo": "Quarto", "modelo": "cesto_roupa", "w": 0.6, "d": 0.6, "inventario": true},
  {"grupo": "Quarto", "modelo": "cesto", "w": 0.6, "d": 0.6},
  {"grupo": "Quarto", "modelo": "chinelos", "w": 0.6, "d": 0.4, "chao": true},
  {"grupo": "Banheiro", "modelo": "banheira", "w": 1.6, "d": 1, "uso": [{"x": 0.3, "y": 1.2, "pose": "privada"}]},
  {"grupo": "Banheiro", "modelo": "pia_banheiro", "w": 0.8, "d": 0.6},
  {"grupo": "Banheiro", "modelo": "vaso_sanitario", "w": 0.6, "d": 0.6},
  {"grupo": "Bichos", "modelo": "caixa_areia", "w": 1, "d": 1, "gato": "areia"},
  {"grupo": "Bichos", "modelo": "potes_gato", "w": 0.8, "d": 0.5, "gato": "comer"},
  {"grupo": "Bichos", "modelo": "caminha_gato", "w": 1, "d": 1, "gato": "dormir"},
  {"grupo": "Bichos", "modelo": "arranhador", "w": 0.8, "d": 0.8, "gato": "arranhar"},
  {"grupo": "Rua", "modelo": "capacho", "w": 1, "d": 0.6, "fora": true, "chao": true},
  {"grupo": "Rua", "modelo": "poste", "w": 0.4, "d": 0.4, "fora": true, "luz": {"cor": "#ffcf7a", "raio": 120, "auto": "rua", "altura": 44}},
  {"grupo": "Rua", "modelo": "arvore", "w": 0.8, "d": 0.8, "fora": true},
  {"grupo": "Rua", "modelo": "banco", "w": 1.2, "d": 0.5, "fora": true},
  {"grupo": "Rua", "modelo": "hidrante", "w": 0.3, "d": 0.3, "fora": true},
  {"grupo": "Rua", "modelo": "portao", "w": 3, "d": 0.1, "fora": true},
  {"grupo": "Construção", "modelo": "escada", "w": 1, "d": 2}];
// Um item novo do catálogo em (x, y), com um id que ainda não existe no mapa.
export function itemDoCatalogo(modelo, x, y, andar, ids) {
  const c = CATALOGO.find((k) => k.modelo === modelo); if (!c) return null;
  const { grupo, ...base } = JSON.parse(JSON.stringify(c)); let n = 1; while (ids.has(`${modelo.replace(/_/g, '-')}-${n}`)) n++;
  const it = { id: `${modelo.replace(/_/g, '-')}-${n}`, ...base, x, y }; if (andar) it.andar = andar;
  if (it.uso) it.uso = it.uso.map((u) => ({ ...u, x: Math.round((u.x + x) * 100) / 100, y: Math.round((u.y + y) * 100) / 100 }));
  if (it.luz) delete it.luz.auto; return it;
}

// O que cada item sabe fazer (J3 e o adendo 10, item 1): [ação, nome, pose, onde (outro móvel, como o sofá da TV)]. O mesmo
// catálogo está no servidor (o 68, FUNCOES), que confere; o boneco do Jean anda até lá e faz. A Pepper usa a mesma ideia
// (os objetos anunciam o que satisfazem, no 68).
export const FUNCOES = { cama: [['deitar', 'Deitar', 'deitada'], ['dormir', 'Dormir', 'deitada']], sofa: [['sentar', 'Sentar', 'sentada'], ['cochilar', 'Cochilar', 'sentada']],
  poltrona: [['sentar', 'Sentar', 'sentada'], ['ler', 'Ler', 'sentada']], cadeira: [['sentar', 'Sentar', 'sentada']], pufe: [['sentar', 'Sentar', 'sentada']], banco: [['sentar', 'Sentar', 'sentada']],
  mesa_jantar: [['sentar', 'Sentar', 'sentada'], ['comer', 'Comer', 'sentada']], mesa: [['trabalhar', 'Trabalhar', 'sentada']],
  geladeira: [['abrir', 'Abrir', 'usando'], ['pegar', 'Pegar algo', 'usando'], ['comer', 'Comer', 'usando']], fogao: [['cozinhar', 'Cozinhar', 'usando']], pia: [['lavar', 'Lavar a louça', 'usando']],
  cafeteira: [['cafe', 'Fazer café', 'usando']], tv: [['assistir', 'Assistir', 'sentada', 'sofa'], ['jogar', 'Jogar videogame', 'sentada', 'sofa']], toca_discos: [['ouvir', 'Ouvir', 'parada']],
  violao: [['tocar', 'Tocar', 'sentada', 'sofa']], estante: [['livro', 'Pegar um livro', 'usando']], livros: [['ler', 'Ler', 'parada']], chinelos: [['calcar', 'Calçar', 'parada']],
  planta_grande: [['regar', 'Regar', 'usando']], aquario: [['olhar', 'Olhar os peixes', 'parada']], caixa: [['abrir_caixa', 'Abrir', 'usando']] };
// O filtro do catálogo por função (J2): o que o item faz na casa.
const SENTA = new Set(Object.entries(FUNCOES).filter(([, l]) => l.some((f) => f[2] !== 'usando' && f[2] !== 'parada')).map(([k]) => k));
const DECORA = new Set(['tapete', 'tapete_redondo', 'manta', 'almofada', 'planta_grande', 'planta_pequena', 'planta_pendurada', 'vasinhos', 'quadro', 'livros', 'prateleira', 'relogio', 'relogio_j', 'vela', 'caneca', 'cortina', 'aquario', 'sapatos']);
export const FUNCOES_FILTRO = { luz: 'Luz', sentar: 'Sentar e deitar', guardar: 'Guardar', decorar: 'Decorar', usar: 'Usar' };
export function funcaoDe(c) { return c.luz ? 'luz' : c.inventario ? 'guardar' : SENTA.has(c.modelo) ? 'sentar' : DECORA.has(c.modelo) ? 'decorar' : 'usar'; }
// O material de cada item (o som do toque, J3): madeira, vidro, tecido, metal, papel ou cerâmica.
const MATS = { tecido: ['sofa', 'poltrona', 'pufe', 'manta', 'almofada', 'tapete', 'tapete_redondo', 'cama', 'cortina', 'cesto_roupa', 'caminha_gato', 'chinelos', 'sapatos', 'capacho', 'arranhador'],
  vidro: ['aquario', 'lava', 'tv', 'monitor', 'luzinhas', 'fita_led'], metal: ['geladeira', 'fogao', 'micro_ondas', 'cafeteira', 'pia', 'elevador', 'caixa_correio', 'poste', 'hidrante', 'pendente', 'luz_armario', 'interruptor', 'luminaria_leitura'],
  papel: ['livros', 'quadro', 'caixa', 'prateleira'], ceramica: ['caneca', 'vaso_sanitario', 'pia_banheiro', 'banheira', 'planta_grande', 'planta_pequena', 'planta_pendurada', 'vasinhos', 'potes_gato', 'vela', 'caixa_areia'] };
const MAT = {}; for (const [m, l] of Object.entries(MATS)) for (const k of l) MAT[k] = m;
export const materialDe = (modelo) => MAT[modelo] || 'madeira';
