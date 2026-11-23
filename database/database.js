const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_FILE = path.join(__dirname, "store.json");

const ALL_GENRES = [
  "Jogo de Tiro", "FPS", "TPS", "Battle Royale", "Hero Shooter",
  "Jogos de Luta", "Beat’ em Up", "Hack and Slash", "Plataforma",
  "Point and Click", "Visual Novel", "Filmes Interativos", "Metroid",
  "Castlevania", "Metroidvania", "Survival Horror", "Mundo Aberto",
  "Sandbox", "Stealth", "Action RPG (RPG de Ação)", "JRPG (RPG Japonês)",
  "RPG Tático (Turnos)", "MMORPG (Albion Online)", "RTS (Tempo Real)",
  "TBS (Turnos)", "MOBA", "Tower Defense", "Simulação de Vida",
  "Construção e Gestão (CLT)", "Simulação de Veículos",
  "Sobrevivência e Crafting", "Esportes Tradicionais", "Corrida Arcade",
  "SimRacing", "Puzzle", "Party Games", "Jogos de Ritmo / Musicais",
  "Card Games", "Jogos Incrementais"
];

const DEFAULT_BANNERS = [
  "./assets/art/studio-banner.svg",
  "./assets/art/cyberpunk-skyline.svg",
  "./assets/art/folklore-eclipse.svg",
  "./assets/art/pixel-workshop.svg"
];

const LEGACY_ASSET_MAP = {
  "/src/assets/images/hero_indie_studio_1795401148551.jpg": "./assets/art/studio-banner.svg",
  "/src/assets/images/banner_cyberpunk_skyline_1795401147995.jpg": "./assets/art/cyberpunk-skyline.svg",
  "/src/assets/images/banner_folklore_eclipse_1795401148169.jpg": "./assets/art/folklore-eclipse.svg",
  "/src/assets/images/cover_beatemup_hero_1795401149084.jpg": "./assets/art/beatemup-arcade.svg",
  "/src/assets/images/banner_pixel_workshop_1795401149532.jpg": "./assets/art/pixel-workshop.svg"
};

function sanitizeLegacyAsset(val) {
  if (typeof val !== "string") return val;
  return LEGACY_ASSET_MAP[val] || val;
}

function hashPassword(pw) {
  return crypto.createHash("sha256").update("dreamore:" + String(pw || "")).digest("hex");
}

function keyOf(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

function createInitialData() {
  const projects = [
    {
      id: "proj-silkspanner",
      title: {
        pt: "O Inacreditável Silkspanner: Profundezas de Delta",
        en: "The Unbelievable Silkspanner: The Delta’s Below",
        es: "El Increíble Silkspanner: Las Profundidades de Delta"
      },
      year: 2029,
      genre: "Action RPG (RPG de Ação)",
      ageRating: "+16",
      ageDetails: "Combate intenso contra criaturas dimensionais do Delta e temas dramáticos.",
      progress: 34,
      creator: "Túlio Parker",
      likes: 342,
      favorites: 189,
      donated: 1450.0,
      goal: 10000.0,
      colors: ["#1e1b4b", "#be123c"],
      cover: "./assets/art/cyberpunk-skyline.svg",
      synopsis: {
        pt: "Após passar por diversos eventos envolvendo fantasmas do passado, Túlio Parker deve enfrentar novos inimigos para manter a paz entre o Delta e a Terra, confrontando o Deltériano Maximus.",
        en: "After going through several events involving ghosts from the past, Túlio Parker must face new enemies to maintain peace between Delta and Earth, confronting the Delterian Maximus.",
        es: "Tras pasar por diversos eventos que involucran fantasmas del pasado, Túlio Parker debe enfrentar nuevos enemigos para mantener la paz entre Delta y la Tierra."
      },
      team: [
        { name: "Túlio Parker", role: "Diretor Criativo & Game Designer", social: "@tulioparker_dev" },
        { name: "Mariana Costa", role: "Pixel Artist & Animadora 2D", social: "@maricosta.art" },
        { name: "Rafael Nunes", role: "Programador C# / Combat System", social: "@rafanunes_code" }
      ],
      comments: [
        { author: "PedroH_Gamer", role: "Visitante", text: "A premissa do Deltériano Maximus ficou absurda! Ansioso demais!", date: "Hoje, 14:20" },
        { author: "Mariana Costa", role: "Desenvolvedor", text: "Estamos finalizando as sprites de movimentação vertical quadro a quadro!", date: "Ontem, 19:05" }
      ]
    },
    {
      id: "proj-eddsworld",
      title: {
        pt: "Edd Contra o Mundo",
        en: "Eddsworld: Edd Versus the World",
        es: "Eddsworld: Edd Contra El Mundo"
      },
      year: 2027,
      genre: "Beat’ em Up",
      ageRating: "+16",
      ageDetails: "Humor ácido, pancadaria arcade frenética e revolta pelo refrigerante de Bacon.",
      progress: 68,
      creator: "Eduardo Gould",
      likes: 418,
      favorites: 245,
      donated: 2820.0,
      goal: 6000.0,
      colors: ["#064e3b", "#16a34a"],
      cover: "./assets/art/beatemup-arcade.svg",
      playableDemo: { title: "Edd Contra o Mundo", ver: "Demo 0.1", file: "./edd_contra_o_mundo.html" },
      synopsis: {
        pt: "Após se revoltar com o fim do refrigerante de Bacon, Edd finalmente começa o seu plano de conclusão contra o Mundo: se ele não puder ser feliz, ninguém será.",
        en: "After revolting over the end of Bacon Soda, Edd finally begins his ultimate plan against the World—if he can't be happy, nobody will.",
        es: "Tras rebelarse por el fin del refresco de Tocino, Edd finalmente comienza su plan definitivo contra el Mundo: si él no puede ser feliz, nadie lo será."
      },
      team: [
        { name: "Eduardo Gould", role: "Animador Quadro-a-Quadro", social: "@edd_cola" },
        { name: "Tom Ridgewell BR", role: "Programador Beat'em Up", social: "@tom_bass" }
      ],
      comments: [
        { author: "BaconLover99", role: "Visitante", text: "BACON COLA PARA SEMPRE! A demo jogável ficou muito divertida!", date: "Ontem, 22:10" }
      ]
    },
    {
      id: "proj-maxakali",
      title: {
        pt: "Eternal Maxakali: Filhos do Sol",
        en: "Eternal Maxakali: Sons Of The Sun",
        es: "Maxakali Eternal: Los Hijos Del Sol"
      },
      year: 2030,
      genre: "Survival Horror",
      ageRating: "+16",
      ageDetails: "Horror folclórico sul-americano, criaturas monstruosas e sobrevivência extrema.",
      progress: 42,
      creator: "Cauã Tikmũ’ũn",
      likes: 415,
      favorites: 240,
      donated: 2350.0,
      goal: 15000.0,
      colors: ["#3f1d0b", "#ea580c"],
      cover: "./assets/art/folklore-eclipse.svg",
      synopsis: {
        pt: "O mundo caiu em desgraça após o eclipse que dividiu a América do Sul em 13 ilhas ao redor de um vulcão ancestral, despertando criaturas do folclore em formas monstruosas.",
        en: "The world fell into ruin after an eclipse split South America into 13 islands around an ancient volcano, awakening folklore creatures in monstrous forms.",
        es: "El mundo cayó en desgracia tras un eclipse que dividió Sudamérica en 13 islas alrededor de un volcán ancestral, despertando criaturas del folclore."
      },
      team: [
        { name: "Cauã Tikmũ’ũn", role: "Criador & Diretor de Arte Folclórica", social: "@caua_maxakali" },
        { name: "Helena Pires", role: "Level Designer & Iluminação", social: "@helenapires_3d" },
        { name: "Diego Alves", role: "Compositor (Instrumentos Nativos)", social: "@diegoalves_ost" }
      ],
      comments: [
        { author: "AnaClara_Dev", role: "Desenvolvedor", text: "Usar o folclore sul-americano pós-eclipse com áudio orgânico é genial.", date: "Hoje, 10:15" }
      ]
    },
    {
      id: "proj-batman",
      title: {
        pt: "Batman: Além do Passado e do Futuro",
        en: "Batman: Beyond Past and Future",
        es: "Batman: Más allá del pasado y del futuro"
      },
      year: 2031,
      genre: "Metroidvania",
      ageRating: "+16",
      ageDetails: "Investigação sombria em duas linhas temporais de Neo-Gotham.",
      progress: 28,
      creator: "Terry & Bruce Lab",
      likes: 389,
      favorites: 215,
      donated: 1890.0,
      goal: 15000.0,
      colors: ["#090d16", "#334155"],
      cover: "./assets/art/cyberpunk-skyline.svg",
      synopsis: {
        pt: "Alterne entre a Gotham clássica e a Neo-Gotham futurista neste Metroidvania interconectado repleto de gadgets, investigação e chefes icônicos.",
        en: "Switch between classic Gotham and futuristic Neo-Gotham in this interconnected Metroidvania packed with gadgets, detective work, and iconic bosses.",
        es: "Alterna entre la Gotham clásica y la Neo-Gotham futurista en este Metroidvania interconectado lleno de gadgets e investigación."
      },
      team: [
        { name: "Terry McGinnis", role: "Lead Metroidvania Designer", social: "@neogotham_dev" },
        { name: "Lucius Fox BR", role: "Gadgets & UI Architect", social: "@wayne_tech_indie" }
      ],
      comments: []
    },
    {
      id: "proj-wolverine",
      title: {
        pt: "Wolverine Selvagem",
        en: "The Uncanny Wolverine",
        es: "El Wolverine Salvaje"
      },
      year: 2028,
      genre: "Hack and Slash",
      ageRating: "+18",
      ageDetails: "Violência visceral estilizada, temática adulta e confrontos brutais contra monstros Gamma.",
      progress: 19,
      creator: "Logan Howlett BR",
      likes: 298,
      favorites: 164,
      donated: 980.0,
      goal: 12000.0,
      colors: ["#451a03", "#b45309"],
      synopsis: {
        pt: "Um homem centenário busca reconquistar sua memória e vida após um experimento brutal, enfrentando mercenários e um cientista transformado em monstro Gamma.",
        en: "A centenarian fighter seeks to reclaim his life after a brutal experiment, facing mercenaries and a scientist transformed into a Gamma monster.",
        es: "Un luchador centenario busca recuperar su vida tras un experimento brutal, enfrentando mercenarios y a un monstruo Gamma."
      },
      team: [
        { name: "Logan Howlett BR", role: "Diretor & Roteirista", social: "@logan_indie" },
        { name: "Bruno Banner", role: "Sound Designer & Foley", social: "@brunobanner_sfx" }
      ],
      comments: [
        { author: "VictorVon", role: "Desenvolvedor", text: "Esse confronto Hack and Slash vai ser lendário.", date: "Há 2 dias" }
      ]
    },
    {
      id: "proj-spawn",
      title: {
        pt: "O Renascimento do SPAWN!",
        en: "The Rebirth of SPAWN!",
        es: "¡El renacimiento de SPAWN!"
      },
      year: 2032,
      genre: "Hack and Slash",
      ageRating: "+18",
      ageDetails: "Fantasia sombria gótica, correntes necroplasmáticas e atmosfera pesada.",
      progress: 15,
      creator: "Al Simmons Works",
      likes: 312,
      favorites: 177,
      donated: 1340.0,
      goal: 12500.0,
      colors: ["#18181b", "#991b1b"],
      synopsis: {
        pt: "Das sombras dos becos góticos, um guerreiro amaldiçoado domina correntes vivas e necroplasma para enfrentar forças infernais e celestiais.",
        en: "From the shadows of gothic alleys, a cursed warrior masters living chains and necroplasm to confront infernal and celestial forces.",
        es: "Desde las sombras de los callejones góticos, un guerrero maldito domina cadenas vivas y necroplasma para enfrentar fuerzas infernales."
      },
      team: [
        { name: "Al Simmons Works", role: "Dark Fantasy Artist & Dev", social: "@ratcity_studio" }
      ],
      comments: []
    },
    {
      id: "proj-daredevil",
      title: {
        pt: "O Homem Sem Medo! Demolidor!",
        en: "The Man Without Fear! Daredevil!",
        es: "¡El hombre sin miedo! Temerário"
      },
      year: 2035,
      genre: "Stealth",
      ageRating: "+16",
      ageDetails: "Combate corpo-a-corpo noturno, furtividade acústica em Hell's Kitchen e temas políticos.",
      progress: 12,
      creator: "Matt Murdock Studio",
      likes: 264,
      favorites: 141,
      donated: 790.0,
      goal: 11000.0,
      colors: ["#450a0a", "#dc2626"],
      synopsis: {
        pt: "O vigilante de Hell's Kitchen retorna à ativa usando ecolocalização sonora e combate acrobático para derrubar um governo tirano.",
        en: "The vigilante of Hell's Kitchen returns using acoustic echolocation and acrobatic combat to dismantle a tyrannical city regime.",
        es: "El vigilante de Hell's Kitchen regresa usando ecolocalización sonora y combate acrobático para derrocar un gobierno tirano."
      },
      team: [
        { name: "Matt Murdock Studio", role: "Stealth & Radar Mechanics", social: "@hellskitchen_dev" },
        { name: "Foggy Nelson", role: "Produtor Executivo", social: "@nelsonmurdock" }
      ],
      comments: []
    },
    {
      id: "proj-lanterns",
      title: {
        pt: "Os Lanternas: O Juramento da Destruição",
        en: "The Lanterns: Oath of Destruction",
        es: "Linternas: Juramento de destrucción"
      },
      year: 2031,
      genre: "TPS",
      ageRating: "+13",
      ageDetails: "Batalhas espaciais e criação de construtos energéticos.",
      progress: 22,
      creator: "Hal Jordan Studio",
      likes: 223,
      favorites: 129,
      donated: 890.0,
      goal: 13000.0,
      colors: ["#065f46", "#10b981"],
      synopsis: {
        pt: "Patrulhe setores espaciais profundos e forje armas de pura força de vontade para impedir o colapso da bateria central.",
        en: "Patrol deep space sectors and forge weapons of pure willpower to prevent the central battery collapse.",
        es: "Patrulla sectores espaciales profundos y forja armas de pura fuerza de voluntad para impedir el colapso."
      },
      team: [
        { name: "Hal Jordan Studio", role: "VFX & Construct Designer", social: "@oa_sector2814" }
      ],
      comments: []
    },
    {
      id: "proj-f4",
      title: {
        pt: "Quarteto F4ntástico: Livros do Destino",
        en: "Fantastic Four: Books of Doom",
        es: "Los Cuatro Fantásticos: Los libros de Doom"
      },
      year: 2032,
      genre: "Point and Click",
      ageRating: "+13",
      ageDetails: "Investigação científica, mistérios cósmicos e quebra-cabeças interdimensionais.",
      progress: 14,
      creator: "Reed Richards Lab",
      likes: 210,
      favorites: 118,
      donated: 640.0,
      goal: 9000.0,
      colors: ["#0c4a6e", "#0284c7"],
      synopsis: {
        pt: "Os Livros do Destino foram espalhados pela realidade; uma equipe científica parte além do conhecimento humano para recuperá-los antes do colapso universal.",
        en: "The Books of Doom have been scattered across reality; a scientific team journeys beyond human knowledge to recover them.",
        es: "Los Libros de Doom han sido esparcidos por la realidad; un equipo científico viaja más allá del conocimiento humano para hallarlos."
      },
      team: [
        { name: "Reed Richards Lab", role: "Narrative & Puzzle Designer", social: "@baxter_building" },
        { name: "Sue Storm Art", role: "Ilustradora de Cenários", social: "@suestorm_art" }
      ],
      comments: []
    },
    {
      id: "proj-ironman",
      title: {
        pt: "O Homem de Ferro: O Coração de Aço",
        en: "The Iron Man: SteelHeart",
        es: "El Hombre de Hierro: Corazón de Acero"
      },
      year: 2035,
      genre: "Action RPG (RPG de Ação)",
      ageRating: "+13",
      ageDetails: "Customização modular de armaduras e combate aéreo.",
      progress: 25,
      creator: "Tony Stark Indie",
      likes: 195,
      favorites: 98,
      donated: 1120.0,
      goal: 14000.0,
      colors: ["#7f1d1d", "#eab308"],
      synopsis: {
        pt: "Construa sua própria armadura peça por peça em uma oficina subterrânea e enfrente corporações tecnológicas corruptas neste Action RPG tático.",
        en: "Build your own armor piece by piece in an underground workshop and confront corrupt tech corporations in this tactical Action RPG.",
        es: "Construye tu propia armadura pieza por pieza en un taller subterráneo y enfrenta corporaciones tecnológicas corruptas."
      },
      team: [
        { name: "Tony Stark Indie", role: "Systems & Armor Engineer", social: "@steelheart_dev" }
      ],
      comments: []
    },
    {
      id: "proj-cap",
      title: {
        pt: "Capitão América: O Homem do Passado",
        en: "Captain America: The Man from the Past",
        es: "Capitán América: El hombre del pasado"
      },
      year: 2030,
      genre: "Beat’ em Up",
      ageRating: "+13",
      ageDetails: "Ação histórica e combate tático com escudo.",
      progress: 18,
      creator: "Steve Rogers Dev",
      likes: 178,
      favorites: 84,
      donated: 530.0,
      goal: 8000.0,
      colors: ["#1e3a8a", "#dc2626"],
      synopsis: {
        pt: "Despertado em uma era desconhecida, um super-soldado precisa adaptar suas táticas clássicas para deter uma organização secreta infiltrada.",
        en: "Awakened in an unfamiliar era, a super-soldier must adapt his classic tactics to stop a covert infiltrated organization.",
        es: "Despertado en una era desconocida, un supersoldado debe adaptar sus tácticas clásicas para detener una organización secreta."
      },
      team: [
        { name: "Steve Rogers Dev", role: "Combat & Shield Physics", social: "@firstavenger_dev" }
      ],
      comments: []
    }
  ];

  const users = [
    {
      id: "usr-jose",
      username: "JoseWillian",
      name: "José Willian",
      email: "jose.willian@dreamore.dev",
      role: "Administrador",
      bio: "Co-criador e arquiteto da DREAMORE+. Focado em ferramentas éticas para estúdios independentes e pixel art humana.",
      location: "São Paulo, Brasil",
      site: "https://dreamore.dev",
      photo: "",
      banner: "./assets/art/studio-banner.svg",
      provider: "local",
      pwHash: hashPassword("dreamore123"),
      socials: { github: "https://github.com/ItaSla", itch: "https://itch.io", youtube: "" },
      resume: "Arquiteto Web, Game Designer e Diretor de Produto da plataforma DREAMORE+.",
      skills: ["Game Design", "JavaScript", "Pixel Art Direction", "Sistemas Comunitários"],
      followers: ["JoaoPedro", "TulioParker", "CauaMaxakali"]
    },
    {
      id: "usr-joao",
      username: "JoaoPedro",
      name: "João Pedro",
      email: "joao.pedro@dreamore.dev",
      role: "Administrador",
      bio: "Co-criador da DREAMORE+. Especialista em UX para jogos, sistemas de comunidade e gameplay responsivo.",
      location: "Brasil",
      site: "https://dreamore.dev",
      photo: "",
      banner: "./assets/art/pixel-workshop.svg",
      provider: "local",
      pwHash: hashPassword("dreamore123"),
      socials: { github: "", youtube: "", artstation: "" },
      resume: "Engenheiro Front-end e Designer de Sistemas Interativos na DREAMORE+.",
      skills: ["UI/UX", "HTML/CSS/JS", "Acessibilidade", "Level Design"],
      followers: ["JoseWillian", "MarianaCosta"]
    },
    {
      id: "usr-tulio",
      username: "TulioParker",
      name: "Túlio Parker",
      email: "tulio@silkspanner.dev",
      role: "Desenvolvedor",
      bio: "Diretor criativo em O Inacreditável Silkspanner. Animador 2D e entusiasta de combate fluido.",
      location: "Belo Horizonte, MG",
      site: "",
      photo: "",
      banner: "./assets/art/cyberpunk-skyline.svg",
      provider: "local",
      pwHash: hashPassword("dreamore123"),
      socials: { twitter: "@tulioparker_dev", itch: "https://itch.io" },
      resume: "6 anos criando protótipos 2D em C# e Godot.",
      skills: ["C#", "Godot", "Combat Design", "Pixel Art"],
      followers: ["JoseWillian"]
    },
    {
      id: "usr-caua",
      username: "CauaMaxakali",
      name: "Cauã Tikmũ’ũn",
      email: "caua@maxakali.dev",
      role: "Desenvolvedor",
      bio: "Criador de Eternal Maxakali. Pesquisa folclore sul-americano e gravações de áudio orgânico.",
      location: "Minas Gerais, Brasil",
      site: "",
      photo: "",
      banner: "./assets/art/folklore-eclipse.svg",
      provider: "local",
      pwHash: hashPassword("dreamore123"),
      socials: { instagram: "@caua_maxakali" },
      resume: "Diretor de arte tradicional e designer narrativo de horror folclórico.",
      skills: ["Ilustração Tradicional", "Foley", "Direção Narrativa"],
      followers: ["JoseWillian"]
    }
  ];

  const feedPosts = [
    {
      id: "feed-1",
      author: "Eduardo Gould",
      username: "EduardoGould",
      role: "Desenvolvedor",
      projectId: "proj-eddsworld",
      projectTitle: "Edd Contra o Mundo",
      tag: "Build Jogável",
      milestone: "Demo 0.1 liberada no navegador",
      content: "Acabamos de publicar a primeira versão jogável de Edd Contra o Mundo direto no navegador! Todo o traço foi animado quadro a quadro pela equipe, sem nenhum uso de IA generativa. Testem os combos e mandem feedback nos comentários.",
      image: "./assets/art/beatemup-arcade.svg",
      likes: 64,
      comments: [
        { author: "Mariana Costa", text: "O feedback visual dos golpes e o estilo cartoon ficaram impecáveis!", date: "Hoje, 11:40" }
      ],
      createdAt: "2026-11-21T14:20:00.000Z"
    },
    {
      id: "feed-2",
      author: "Cauã Tikmũ’ũn",
      username: "CauaMaxakali",
      role: "Desenvolvedor",
      projectId: "proj-maxakali",
      projectTitle: "Eternal Maxakali: Filhos do Sol",
      tag: "Arte & Atmosfera",
      milestone: "Iluminação do Eclipse Solar nas 13 Ilhas",
      content: "Finalizamos o conceito visual principal do vulcão central e das 13 ilhas flutuantes sob o eclipse. Também concluímos as gravações de percussão orgânica na mata para a trilha dinâmica.",
      image: "./assets/art/folklore-eclipse.svg",
      likes: 88,
      comments: [],
      createdAt: "2026-11-20T18:10:00.000Z"
    },
    {
      id: "feed-3",
      author: "Túlio Parker",
      username: "TulioParker",
      role: "Desenvolvedor",
      projectId: "proj-silkspanner",
      projectTitle: "O Inacreditável Silkspanner: Profundezas de Delta",
      tag: "Progresso Técnico",
      milestone: "Física de balanço vertical e tilemap noturno",
      content: "Prototipamos o novo deslocamento pelos telhados de Delta com transição de câmera suave em 60fps. Buscamos mais um Sound Designer para os impactos dimensionais!",
      image: "./assets/art/cyberpunk-skyline.svg",
      likes: 53,
      comments: [
        { author: "Bruno Banner", text: "Posso ajudar com foley de impacto e ambiência urbana!", date: "Ontem, 20:12" }
      ],
      createdAt: "2026-11-19T16:45:00.000Z"
    },
    {
      id: "feed-4",
      author: "José Willian",
      username: "JoseWillian",
      role: "Administrador",
      projectId: "",
      projectTitle: "DREAMORE+ Plataforma",
      tag: "Atualização",
      milestone: "Nova identidade visual, Feed Unificado & Academia GameDev",
      content: "Seja bem-vindo à nova fase da DREAMORE+! Substituímos os antigos devlogs isolados por este Feed contínuo para você acompanhar avanços em imagens e builds, além do novo menu Ajuda a GameDevs com mentorias reais.",
      image: "./assets/art/studio-banner.svg",
      likes: 112,
      comments: [],
      createdAt: "2026-11-22T09:00:00.000Z"
    }
  ];

  const chats = {
    geral: [
      { id: "c1", user: "Túlio Parker", role: "Desenvolvedor", text: "Alguém disponível para testar a colisão de hitbox 2D hoje à noite?", ts: Date.now() - 3600000 * 5 },
      { id: "c2", user: "Cauã Tikmũ’ũn", role: "Desenvolvedor", text: "Eu topo! Também subi um pack de partículas de fogo desenhadas quadro a quadro.", ts: Date.now() - 3600000 * 4 },
      { id: "c3", user: "Mariana Costa", role: "Desenvolvedor", text: "Lembrando: todos os sprites no repositório estão com licença de crédito protegida.", ts: Date.now() - 3600000 * 3 },
      { id: "c4", user: "Rafael Nunes", role: "Desenvolvedor", text: "Publiquei o sistema de inventário modular no Marketplace, feedback é bem-vindo!", ts: Date.now() - 3600000 * 2 }
    ],
    devs: [
      { id: "d1", user: "Rafael Nunes", role: "Desenvolvedor", text: "Dica: usem fixed timestep de 1/60s na física de plataforma para evitar jitter.", ts: Date.now() - 7200000 }
    ],
    arte: [
      { id: "a1", user: "Mariana Costa", role: "Desenvolvedor", text: "Compartilhando paletas indexadas de 16 cores para pixel art retrô.", ts: Date.now() - 5400000 }
    ],
    feedback: [
      { id: "f1", user: "Eduardo Gould", role: "Desenvolvedor", text: "O que acharam da velocidade dos combos na Demo 0.1 de Edd Contra o Mundo?", ts: Date.now() - 1800000 }
    ]
  };

  const groups = [
    {
      id: "grp-indie-br",
      name: "Estúdios Indie Brasil",
      desc: "Troca de feedback de gameplay, playtests semanais e parcerias.",
      photo: "./assets/art/studio-banner.svg",
      owner: "JoseWillian",
      moderators: ["JoseWillian", "JoaoPedro"],
      mods: ["JoaoPedro"],
      members: ["JoseWillian", "JoaoPedro", "TulioParker", "CauaMaxakali"],
      visibility: "public"
    }
  ];

  const gamedevHelp = {
    docs: [
      {
        id: "doc-gdd",
        category: "Design & Produção",
        title: "Guia Prático de GDD (Game Design Document) Enxuto",
        readTime: "8 min",
        author: "Prof. João Pedro",
        summary: "Como estruturar loop principal, pilares de gameplay, escopo mínimo viável (Vertical Slice) e cronograma realista para times de 1 a 5 pessoas.",
        sections: [
          "1. Pilares do Jogo: defina no máximo 3 sensações centrais que guiam todas as decisões.",
          "2. Loop Central (30 segundos): o que o jogador faz, que recompensa recebe e qual decisão toma em seguida.",
          "3. Escopo de Vertical Slice: crie 1 fase completa com áudio, UI e chefes antes de expandir para 10 fases."
        ]
      },
      {
        id: "doc-pixel",
        category: "Arte 100% Humana",
        title: "Fundamentos de Pixel Art, Silhueta e Animação Quadro-a-Quadro",
        readTime: "12 min",
        author: "Profa. Mariana Costa",
        summary: "Domine resolução base (320x180 / 640x360), controle de paleta hue-shifted, antialiasing manual e princípios de antecipação e impacto.",
        sections: [
          "1. Leia primeiro a silhueta em preto puro: se o personagem não for reconhecível sem detalhes internos, refine a pose.",
          "2. Use 3 a 4 tons por rampa com deslocamento de matiz (sombras mais frias, luzes mais quentes).",
          "3. Em combate 2D, use 2 frames de antecipação, 1 frame de impacto com hitstop e 3 frames de recuperação."
        ]
      },
      {
        id: "doc-godot",
        category: "Programação & Engines",
        title: "Arquitetura Desacoplada em Godot, Unity e HTML5 Canvas",
        readTime: "10 min",
        author: "Prof. Rafael Nunes",
        summary: "Padrões de Máquina de Estados Finita (FSM), Signals/Events e separação entre simulação física (FixedUpdate) e renderização.",
        sections: [
          "1. Nunca misture leitura de input com código de animação dentro do mesmo bloco gigante.",
          "2. Use eventos/sinais para UI (HP, pontuação, diálogo) desacoplando o HUD da lógica do jogador.",
          "3. Implemente coyote time (100ms) e jump buffering (120ms) para controles imediatamente responsivos."
        ]
      },
      {
        id: "doc-ip",
        category: "Ética, IP & Divulgação",
        title: "Proteção de Propriedade Intelectual e Lançamento Indie",
        readTime: "6 min",
        author: "Prof. José Willian",
        summary: "Acordos claros de coautoria, licenciamento de assets humanos, prevenção contra golpes e estratégia de página na loja.",
        sections: [
          "1. Documente desde o dia 1 quem criou cada sprite, trilha e módulo de código.",
          "2. Mantenha backups versionados com histórico de criação (commits + arquivos fonte .ase/.wav/.blend).",
          "3. Construa comunidade com GIFs de gameplay reais e demos jogáveis no navegador."
        ]
      }
    ],
    videos: [
      {
        id: "vid-1",
        title: "Aula 01: Criando seu Primeiro Beat'em Up em HTML5 Canvas",
        instructor: "Eduardo Gould & João Pedro",
        duration: "24:15",
        level: "Iniciante",
        topic: "Gameplay & Colisão",
        thumbnail: "./assets/art/beatemup-arcade.svg",
        description: "Passo a passo construindo loop de animação, caixas de colisão AABB, knockback e efeitos visuais de impacto.",
        chapters: ["00:00 Loop 60fps", "06:40 Hitbox vs Hurtbox", "14:20 Hitstop & Screen Shake", "20:00 Polimento"]
      },
      {
        id: "vid-2",
        title: "Aula 02: Iluminação Atmosférica e Narrativa Ambiental em 2D",
        instructor: "Cauã Tikmũ’ũn",
        duration: "31:40",
        level: "Intermediário",
        topic: "Direção de Arte",
        thumbnail: "./assets/art/folklore-eclipse.svg",
        description: "Como guiar o olhar do jogador usando contraste cromático, camadas de parallax e sons orgânicos sem tutoriais invasivos.",
        chapters: ["00:00 Contraste de Valores", "09:15 Parallax em 5 Camadas", "19:30 Áudio Adaptativo"]
      },
      {
        id: "vid-3",
        title: "Aula 03: UI de Estúdio, HUD Legível e Acessibilidade em Jogos",
        instructor: "José Willian",
        duration: "19:50",
        level: "Todos os Níveis",
        topic: "UX & Acessibilidade",
        thumbnail: "./assets/art/studio-banner.svg",
        description: "Como projetar menus responsivos, suporte a daltonismo, legendas configuráveis e navegação completa por teclado/gamepad.",
        chapters: ["00:00 Hierarquia no HUD", "07:10 Contraste & Daltonismo", "13:50 Navegação por Teclado"]
      }
    ],
    courses: [
      {
        id: "crs-platformer",
        title: "Trilha Completa: Do Zero ao Protótipo Jogável",
        platform: "Academia DREAMORE+",
        level: "Iniciante",
        hours: "6h",
        instructor: "Prof. João Pedro",
        modules: [
          { id: "m1", title: "Escopo enxuto e escolha de gênero", duration: "35m" },
          { id: "m2", title: "Movimentação com Coyote Time e Dash", duration: "1h 20m" },
          { id: "m3", title: "Spritesheets humanas e som foley", duration: "1h 45m" },
          { id: "m4", title: "Exportando demo web e recebendo feedback", duration: "1h 10m" }
        ]
      },
      {
        id: "crs-godot",
        title: "Godot 4 para Jogos 2D e Action RPG",
        platform: "GDQuest / Comunidade Godot",
        level: "Intermediário",
        hours: "12h",
        instructor: "Prof. Rafael Nunes",
        modules: [
          { id: "g1", title: "Nós, Cenas e Sinais desacoplados", duration: "2h" },
          { id: "g2", title: "Máquina de Estados para combate", duration: "3h" },
          { id: "g3", title: "Inventário e salvamento JSON", duration: "3h 30m" },
          { id: "g4", title: "Otimização e build multiplataforma", duration: "3h 30m" }
        ]
      },
      {
        id: "crs-pixel",
        title: "Pixel Art & Animação Frame-a-Frame (Zero IA)",
        platform: "Aseprite Studio Workshop",
        level: "Iniciante / Intermediário",
        hours: "8h",
        instructor: "Profa. Mariana Costa",
        modules: [
          { id: "p1", title: "Teoria da cor e paletas limitadas", duration: "2h" },
          { id: "p2", title: "Walk cycle, idle e ataques expressivos", duration: "3h" },
          { id: "p3", title: "Tilesets autotile e parallax urbano", duration: "3h" }
        ]
      }
    ],
    mentorMessages: [
      {
        id: "gm-1",
        author: "Prof. João Pedro",
        role: "Professor · Game Design & UX",
        text: "Olá, dev! Bem-vindo à sala de mentoria da DREAMORE+. Qual parte do seu projeto está travada hoje — escopo, controles ou arte?",
        ts: Date.now() - 3600000 * 3
      },
      {
        id: "gm-2",
        author: "Profa. Mariana Costa",
        role: "Professora · Pixel Art Humana",
        text: "Se precisar de revisão de spritesheet ou escolha de paleta para seu protótipo, descreva seu estilo aqui que respondemos com dicas práticas!",
        ts: Date.now() - 3600000 * 1
      }
    ]
  };

  const marketplace = [
    { id: "asset-1", title: "Kit Sprites Cyberpunk Neo-Gotham (64x64)", author: "Lucius Fox BR", type: "Pixel Art 2D (100% Humano)", price: 29.9, fmt: "PNG / ASE", rate: 4.8, sales: 312, d: "Kit de tiles, props e personagens em 64x64 para cenários urbanos futuristas, desenhado quadro a quadro.", inc: ["120 sprites PNG", "Tileset de rua e telhados", "Paleta .gpl", "Arquivos .aseprite"] },
    { id: "asset-2", title: "Pack SFX Combate Hack & Slash Orgânico", author: "Bruno Banner", type: "Áudio / Foley WAV", price: 19.9, fmt: "WAV", rate: 4.7, sales: 241, d: "Golpes, defesas, passos e impactos gravados com foley real e editados à mão.", inc: ["96 efeitos WAV 48 kHz", "Variações por intensidade", "Guia de uso no Unity e Godot"] },
    { id: "asset-3", title: "Sistema Modular de Inventário RPG (C# / JS)", author: "Rafael Nunes", type: "Código / Arquitetura", price: 34.9, fmt: "C# / JS", rate: 4.9, sales: 187, d: "Inventário em grade com pilhas, raridade, equipamentos e salvamento em módulos independentes.", inc: ["Código-fonte C# e JS", "Cena de exemplo", "Documentação em PT-BR"] },
    { id: "asset-4", title: "Roteiro & GDD Completo: Metroidvania Temporal", author: "Terry McGinnis", type: "Propriedade / Ideia de Jogo", price: 49.9, fmt: "PDF / XLSX", rate: 4.6, sales: 74, d: "Documento de design completo com mecânicas, mapa, progressão e cronograma de produção.", inc: ["GDD de 60 páginas", "Fluxograma de progressão", "Planilha de balanceamento"] },
    { id: "asset-5", title: "Pack UI Fantasia Medieval (HUD completo)", author: "Mariana Costa", type: "Pixel Art 2D (100% Humano)", price: 24.9, fmt: "PNG / PSD", rate: 4.7, sales: 158, d: "Barras de vida, inventário, diálogos e botões prontos para RPGs.", inc: ["80 elementos de interface", "Fonte pixel livre", "Tela de exemplo"] },
    { id: "asset-6", title: "Trilha Sonora: Florestas do Sul (12 faixas)", author: "Cauã Tikmũ’ũn", type: "Áudio / Foley WAV", price: 59.9, fmt: "WAV / OGG", rate: 4.9, sales: 96, d: "Composições com instrumentos e percussão gravados ao vivo, em loops e versões completas.", inc: ["12 faixas WAV", "Loops sem emenda", "Licença comercial"] },
    { id: "asset-7", title: "Controlador Platformer 2D Completo", author: "Rafael Nunes", type: "Código / Arquitetura", price: 39.9, fmt: "C#", rate: 4.8, sales: 205, d: "Pulo variável, coyote time, wall jump, dash e buffer de entrada, com parâmetros ajustáveis.", inc: ["Código-fonte C#", "Projeto de exemplo", "Vídeo de configuração"] },
    { id: "asset-8", title: "Bestiário Folclórico: 24 Criaturas Animadas", author: "Túlio Parker", type: "Pixel Art 2D (100% Humano)", price: 44.9, fmt: "PNG / ASE", rate: 4.8, sales: 133, d: "Criaturas inspiradas no folclore sul-americano, com ciclos de idle, ataque e morte.", inc: ["24 spritesheets", "Animações de 6 a 12 frames", "Arquivos fonte"] },
    { id: "asset-9", title: "Pack de Partículas de Fogo e Fumaça", author: "Cauã Tikmũ’ũn", type: "Pixel Art 2D (100% Humano)", price: 14.9, fmt: "PNG", rate: 4.5, sales: 289, d: "Efeitos de fogo, brasas, fumaça e explosões desenhados à mão em sprites animados.", inc: ["40 efeitos animados", "Versões em 3 tamanhos"] },
    { id: "asset-10", title: "Ambiente Sonoro: Cidade Noturna", author: "Bruno Banner", type: "Áudio / Foley WAV", price: 21.9, fmt: "WAV", rate: 4.6, sales: 118, d: "Camadas de trânsito, chuva e ambientação urbana.", inc: ["30 camadas WAV", "Loops de 2 minutos"] },
    { id: "asset-11", title: "Sistema de Diálogos Ramificados", author: "Rafael Nunes", type: "Código / Arquitetura", price: 32.9, fmt: "C# / JS", rate: 4.7, sales: 142, d: "Editor de árvores de diálogo com variáveis, condições e exportação JSON.", inc: ["Editor visual", "Runtime C# e JS", "Exemplos de quests"] },
    { id: "asset-12", title: "Roteiro: Terror Folclórico em 5 Atos", author: "Terry McGinnis", type: "Propriedade / Ideia de Jogo", price: 29.9, fmt: "PDF", rate: 4.5, sales: 51, d: "Roteiro, personagens e fluxo de cenas para terror ambientado em floresta.", inc: ["Roteiro de 5 atos", "Fichas de personagens", "Lista de cenários"] }
  ];

  const news = [
    { tag: "INDIE SPOTLIGHT", title: "DREAMORE+ ultrapassa 100% de projetos verificados sem IA Generativa em arte", date: "16 Nov 2026", summary: "Estúdios independentes celebram a proteção de propriedade intelectual e a transparência na taxa de 5%." },
    { tag: "LANÇAMENTO", title: "Demo jogável de Edd Contra o Mundo estreia diretamente no navegador", date: "20 Nov 2026", summary: "O Beat'em Up animado quadro a quadro já pode ser testado sem downloads dentro da página do projeto." },
    { tag: "PROMOÇÃO INDIE", title: "Festival de Pixel Art & Metroidvania traz vitrines colaborativas neste mês", date: "14 Nov 2026", summary: "Confira destaques de jogos independentes feitos à mão abertos para formação de equipe." },
    { tag: "ESTÚDIOS", title: "Kojima Studios e Mojang Studios inspiram trilhas de design narrativo e sandbox", date: "08 Nov 2026", summary: "Comunidade debate como unir liberdade criativa e narrativa cinematográfica em equipes enxutas." }
  ];

  const affiliated = [
    { name: "Minecraft Dungeons 2", type: "Projeto Afiliado", tag: "Action RPG / Co-op" },
    { name: "Marvel Spider-Man 2", type: "Projeto Afiliado", tag: "Ação / Mundo Aberto" },
    { name: "Dragon Ball: Sparking Zero", type: "Projeto Afiliado", tag: "Arena Fighter" },
    { name: "KOJIMA STUDIOS", type: "Estúdio Parceiro", tag: "Inovação Narrativa" },
    { name: "MOJANG STUDIOS", type: "Estúdio Parceiro", tag: "Sandbox & Comunidade" }
  ];

  return {
    meta: { version: 2, visitsCount: 1482, createdAt: new Date().toISOString() },
    genres: ALL_GENRES,
    defaultBanners: DEFAULT_BANNERS,
    users,
    projects,
    feedPosts,
    chats,
    groups,
    gamedevHelp,
    marketplace,
    news,
    affiliated,
    applications: [],
    courseProgress: {},
    salesHistory: [
      { buyer: "Túlio Parker", item: "Kit Sprites Cyberpunk Neo-Gotham", amount: 29.9, date: "14/11/2026" },
      { buyer: "Mariana Costa", item: "Plano Sonhador Experiente", amount: 9.99, date: "15/11/2026" }
    ]
  };
}

const PROJECT_DEFAULT_META = {
  "proj-silkspanner": { icon: "bolt", releaseDate: "2029-09-15" },
  "proj-eddsworld": { icon: "gamepad", releaseDate: "2027-06-20" },
  "proj-maxakali": { icon: "flame", releaseDate: "2030-10-31" },
  "proj-batman": { icon: "shield", releaseDate: "2031-03-22" },
  "proj-wolverine": { icon: "sword", releaseDate: "2028-11-10" },
  "proj-spawn": { icon: "skull", releaseDate: "2032-08-13" },
  "proj-daredevil": { icon: "compass", releaseDate: "2035-04-05" },
  "proj-lanterns": { icon: "rocket", releaseDate: "2031-07-18" },
  "proj-f4": { icon: "wrench", releaseDate: "2032-02-28" },
  "proj-ironman": { icon: "wrench", releaseDate: "2035-05-02" },
  "proj-cap": { icon: "shield", releaseDate: "2030-07-04" },
};

class DreamoreDatabase {
  constructor(filePath = DB_FILE) {
    this.filePath = filePath;
    this.data = null;
    this.load();
  }

  migrateStore() {
    let changed = false;
    if (Array.isArray(this.data.defaultBanners)) {
      this.data.defaultBanners = this.data.defaultBanners.map((b) => {
        const next = sanitizeLegacyAsset(b);
        if (next !== b) changed = true;
        return next;
      });
    } else {
      this.data.defaultBanners = [...DEFAULT_BANNERS];
      changed = true;
    }
    (this.data.projects || []).forEach((p) => {
      const def = PROJECT_DEFAULT_META[p.id] || {};
      if (!p.icon) {
        p.icon = def.icon || "gamepad";
        changed = true;
      }
      if (!p.releaseDate) {
        p.releaseDate = def.releaseDate || `${p.year || 2028}-12-01`;
        changed = true;
      }
      if (p.cover) {
        const nextCover = sanitizeLegacyAsset(p.cover);
        if (nextCover !== p.cover) {
          p.cover = nextCover;
          changed = true;
        }
      }
      if (p.playableDemo?.file === "/edd_contra_o_mundo.html") {
        p.playableDemo.file = "./edd_contra_o_mundo.html";
        changed = true;
      }
      if (!Array.isArray(p.gallery)) {
        p.gallery = p.cover ? [p.cover] : [];
        changed = true;
      } else {
        p.gallery = p.gallery.map((g) => {
          const next = sanitizeLegacyAsset(g);
          if (next !== g) changed = true;
          return next;
        });
      }
    });
    (this.data.users || []).forEach((u, idx) => {
      if (typeof u.online !== "boolean") {
        u.online = idx < 2;
        u.lastSeen = Date.now() - idx * 30000;
        changed = true;
      }
      if (u.banner) {
        const nextBanner = sanitizeLegacyAsset(u.banner);
        if (nextBanner !== u.banner) {
          u.banner = nextBanner;
          changed = true;
        }
      }
      if (u.photo) {
        const nextPhoto = sanitizeLegacyAsset(u.photo);
        if (nextPhoto !== u.photo) {
          u.photo = nextPhoto;
          changed = true;
        }
      }
      if (!u.socials) {
        u.socials = {};
        changed = true;
      }
    });
    (this.data.feedPosts || []).forEach((fp) => {
      if (fp.image) {
        const nextImg = sanitizeLegacyAsset(fp.image);
        if (nextImg !== fp.image) {
          fp.image = nextImg;
          changed = true;
        }
      }
    });
    (this.data.gamedevHelp?.videos || []).forEach((v) => {
      if (v.thumbnail) {
        const nextThumb = sanitizeLegacyAsset(v.thumbnail);
        if (nextThumb !== v.thumbnail) {
          v.thumbnail = nextThumb;
          changed = true;
        }
      }
    });
    (this.data.groups || []).forEach((g) => {
      if (g.img && !g.photo) {
        g.photo = g.img;
        changed = true;
      }
      if (g.photo) {
        const nextPhoto = sanitizeLegacyAsset(g.photo);
        if (nextPhoto !== g.photo) {
          g.photo = nextPhoto;
          changed = true;
        }
      }
      if (!Array.isArray(g.moderators)) {
        const list = [g.owner, ...(Array.isArray(g.mods) ? g.mods : [])].filter(Boolean);
        g.moderators = Array.from(new Set(list));
        changed = true;
      }
      if (!Array.isArray(g.members)) {
        g.members = [g.owner].filter(Boolean);
        changed = true;
      }
      if (!g.visibility) {
        g.visibility = "public";
        changed = true;
      }
    });
    if (changed) this.save();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.users)) {
          this.data = parsed;
          this.migrateStore();
          return this.data;
        }
      }
    } catch (_err) {
      // Fallback to fresh initial seed if store file is malformed
    }
    this.data = createInitialData();
    this.migrateStore();
    this.save();
    return this.data;
  }

  save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  sanitizeUser(u) {
    if (!u) return null;
    const pub = { ...u };
    delete pub.pwHash;
    return pub;
  }

  getBootstrap() {
    this.data.meta.visitsCount = (this.data.meta.visitsCount || 0) + 1;
    this.save();
    return {
      meta: this.data.meta,
      genres: this.data.genres,
      defaultBanners: this.data.defaultBanners,
      projects: this.data.projects,
      users: this.data.users.map((u) => this.sanitizeUser(u)),
      feedPosts: this.data.feedPosts,
      chats: this.data.chats,
      groups: this.data.groups,
      gamedevHelp: this.data.gamedevHelp,
      marketplace: this.data.marketplace,
      news: this.data.news,
      affiliated: this.data.affiliated,
      applications: this.data.applications,
      courseProgress: this.data.courseProgress,
      salesHistory: this.data.salesHistory
    };
  }

  authenticateLocal(identifier, password) {
    const id = String(identifier || "").trim().toLowerCase();
    const user = this.data.users.find(
      (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id
    );
    if (!user) return { error: "Conta não encontrada. Cadastre-se primeiro." };
    if (user.pwHash && user.pwHash !== hashPassword(password)) {
      return { error: "Senha incorreta." };
    }
    user.online = true;
    user.lastSeen = Date.now();
    this.save();
    return { user: this.sanitizeUser(user) };
  }

  registerUser({ username, email, password, photo, role }) {
    const cleanUser = String(username || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanUser || !cleanEmail) {
      return { error: "Nome de usuário e e-mail são obrigatórios." };
    }
    const exists = this.data.users.find(
      (u) => u.username.toLowerCase() === cleanUser.toLowerCase() || u.email.toLowerCase() === cleanEmail
    );
    if (exists) {
      return { error: "Nome de usuário ou e-mail já cadastrado." };
    }
    const newUser = {
      id: "usr-" + Date.now(),
      username: cleanUser,
      name: cleanUser,
      email: cleanEmail,
      role: role === "Desenvolvedor" ? "Desenvolvedor" : "Visitante",
      bio: "",
      location: "",
      site: "",
      photo: photo || "",
      banner: this.data.defaultBanners[0],
      provider: "local",
      pwHash: hashPassword(password),
      socials: {},
      resume: "",
      skills: [],
      followers: []
    };
    this.data.users.push(newUser);
    this.save();
    return { user: this.sanitizeUser(newUser) };
  }

  upsertGoogleUser({ email, name, photo, sub }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return { error: "E-mail do Google inválido." };
    let user = this.data.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      const baseHandle = (name || cleanEmail.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "") || "Sonhador";
      let candidate = baseHandle;
      let suffix = 1;
      while (this.data.users.some((u) => u.username.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${baseHandle}${suffix++}`;
      }
      user = {
        id: "usr-g-" + (sub || Date.now()),
        username: candidate,
        name: name || candidate,
        email: cleanEmail,
        role: "Desenvolvedor",
        bio: "Conta conectada via Google na DREAMORE+.",
        location: "",
        site: "",
        photo: photo || "",
        banner: this.data.defaultBanners[1],
        provider: "google",
        pwHash: "",
        socials: {},
        resume: "",
        skills: [],
        followers: []
      };
      this.data.users.push(user);
    } else {
      if (photo && !user.photo) user.photo = photo;
      if (name && !user.name) user.name = name;
      user.provider = "google";
    }
    this.save();
    return { user: this.sanitizeUser(user) };
  }

  setUserPresence(username, online = true) {
    const user = this.data.users.find(
      (u) => keyOf(u.username) === keyOf(username) || u.id === username
    );
    if (!user) return null;
    user.online = Boolean(online);
    user.lastSeen = Date.now();
    this.save();
    return this.sanitizeUser(user);
  }

  updateUser(username, patch) {
    const user = this.data.users.find(
      (u) => keyOf(u.username) === keyOf(username) || u.id === username
    );
    if (!user) return { error: "Usuário não encontrado." };
    const allowed = ["name", "bio", "location", "site", "photo", "banner", "role", "socials", "resume", "skills", "device", "online"];
    allowed.forEach((field) => {
      if (patch[field] !== undefined) user[field] = patch[field];
    });
    user.lastSeen = Date.now();
    this.save();
    return { user: this.sanitizeUser(user) };
  }

  toggleFollow(targetUsername, followerUsername) {
    const target = this.data.users.find((u) => keyOf(u.username) === keyOf(targetUsername));
    if (!target) return { error: "Perfil não encontrado." };
    target.followers = Array.isArray(target.followers) ? target.followers : [];
    const idx = target.followers.findIndex((f) => keyOf(f) === keyOf(followerUsername));
    if (idx >= 0) target.followers.splice(idx, 1);
    else target.followers.push(followerUsername);
    this.save();
    return { user: this.sanitizeUser(target), following: idx < 0 };
  }

  createProject(payload) {
    const id = "proj-" + Date.now();
    const releaseDate = payload.releaseDate || `${Number(payload.year) || 2028}-12-01`;
    const cover = payload.cover || "";
    const project = {
      id,
      icon: payload.icon || "gamepad",
      title: payload.title,
      year: Number(payload.year) || Number(String(releaseDate).slice(0, 4)) || 2028,
      releaseDate,
      genre: payload.genre || "Aventura",
      ageRating: payload.ageRating || "Livre",
      ageDetails: payload.ageDetails || "",
      progress: Math.min(100, Math.max(0, Number(payload.progress) || 5)),
      creator: payload.creator || "Desenvolvedor",
      likes: 1,
      favorites: 0,
      donated: 0,
      goal: Math.max(500, Number(payload.goal) || 5000),
      colors: payload.colors || ["#312e81", "#0f766e"],
      cover,
      gallery: Array.isArray(payload.gallery) ? payload.gallery : cover ? [cover] : [],
      synopsis: payload.synopsis,
      team: payload.team || [{ name: payload.creator || "Desenvolvedor", role: "Criador Principal", social: "@dreamore" }],
      comments: []
    };
    this.data.projects.unshift(project);
    this.save();
    return project;
  }

  updateProject(id, patch) {
    const proj = this.data.projects.find((p) => p.id === id);
    if (!proj) return null;
    if (patch.releaseDate && !patch.year) {
      const yr = Number(String(patch.releaseDate).slice(0, 4));
      if (yr >= 2000) patch.year = yr;
    }
    Object.assign(proj, patch);
    this.save();
    return proj;
  }

  deleteProject(id) {
    const before = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.save();
    return this.data.projects.length !== before;
  }

  addProjectComment(projectId, comment) {
    const proj = this.data.projects.find((p) => p.id === projectId);
    if (!proj) return null;
    proj.comments = proj.comments || [];
    proj.comments.unshift(comment);
    this.save();
    return proj;
  }

  createFeedPost(post) {
    const item = {
      id: "feed-" + Date.now(),
      author: post.author || "Sonhador",
      username: post.username || "Sonhador",
      role: post.role || "Visitante",
      projectId: post.projectId || "",
      projectTitle: post.projectTitle || "Atualização Geral",
      tag: post.tag || "Progresso",
      milestone: post.milestone || "",
      content: post.content || "",
      image: post.image || "",
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString()
    };
    this.data.feedPosts.unshift(item);
    this.save();
    return item;
  }

  likeFeedPost(id) {
    const post = this.data.feedPosts.find((f) => f.id === id);
    if (!post) return null;
    post.likes = (post.likes || 0) + 1;
    this.save();
    return post;
  }

  commentFeedPost(id, comment) {
    const post = this.data.feedPosts.find((f) => f.id === id);
    if (!post) return null;
    post.comments = post.comments || [];
    post.comments.push(comment);
    this.save();
    return post;
  }

  addChatMessage(channelId, msg) {
    this.data.chats[channelId] = this.data.chats[channelId] || [];
    const item = {
      id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 999),
      user: msg.user,
      role: msg.role || "Membro",
      text: msg.text || "",
      attachment: msg.attachment || null,
      ts: Date.now()
    };
    this.data.chats[channelId].push(item);
    this.save();
    return item;
  }

  deleteChatMessage(channelId, msgId) {
    if (!this.data.chats[channelId]) return false;
    this.data.chats[channelId] = this.data.chats[channelId].filter((m) => m.id !== msgId);
    this.save();
    return true;
  }

  createGroup(group) {
    const owner = group.owner || "Dev";
    const rawMods = Array.isArray(group.moderators) ? group.moderators : Array.isArray(group.mods) ? group.mods : [];
    const moderators = Array.from(new Set([owner, ...rawMods].filter(Boolean)));
    const members = Array.from(new Set([owner, ...(Array.isArray(group.members) ? group.members : []), ...moderators].filter(Boolean)));
    const item = {
      id: group.id || "grp-" + Date.now(),
      name: group.name,
      desc: group.desc || "",
      photo: group.photo || group.img || "",
      owner,
      ownerUid: group.ownerUid || "",
      moderators,
      mods: moderators.filter((m) => keyOf(m) !== keyOf(owner)),
      members,
      visibility: group.visibility === "private" ? "private" : "public"
    };
    this.data.groups.push(item);
    this.save();
    return item;
  }

  updateGroup(id, patch) {
    const grp = (this.data.groups || []).find((g) => g.id === id);
    if (!grp) return null;
    if (patch.name !== undefined) grp.name = patch.name;
    if (patch.desc !== undefined) grp.desc = patch.desc;
    if (patch.photo !== undefined) grp.photo = patch.photo;
    if (patch.img !== undefined && patch.photo === undefined) grp.photo = patch.img;
    if (patch.visibility === "private" || patch.visibility === "public") grp.visibility = patch.visibility;
    if (Array.isArray(patch.moderators)) {
      const mods = Array.from(new Set([grp.owner, ...patch.moderators].filter(Boolean)));
      grp.moderators = mods;
      grp.mods = mods.filter((m) => keyOf(m) !== keyOf(grp.owner));
    }
    if (Array.isArray(patch.members)) {
      grp.members = Array.from(new Set([grp.owner, ...patch.members, ...(grp.moderators || [])].filter(Boolean)));
    }
    this.save();
    return grp;
  }

  addMentorMessage(msg) {
    const item = {
      id: "gm-" + Date.now(),
      author: msg.author,
      role: msg.role || "Aluno / GameDev",
      text: msg.text,
      ts: Date.now()
    };
    this.data.gamedevHelp.mentorMessages.push(item);
    // Helpful mentor auto-reply for interactive learning feel
    const lower = String(msg.text || "").toLowerCase();
    let reply = "Ótima pergunta! Sugiro começar definindo o loop central de 30 segundos do seu jogo e testar com um protótipo cinza antes de produzir os sprites finais.";
    if (lower.includes("pixel") || lower.includes("arte") || lower.includes("sprite")) {
      reply = "Dica de Pixel Art: mantenha uma grade consistente (ex: 16x16 ou 32x32), trabalhe com silhuetas claras e no máximo 4 tons por cor com deslocamento de matiz.";
    } else if (lower.includes("godot") || lower.includes("unity") || lower.includes("código") || lower.includes("colis")) {
      reply = "Sobre arquitetura: separe a lógica de movimento no passo fixo (FixedUpdate / _physics_process) e use uma máquina de estados para pulo, ataque e dano.";
    } else if (lower.includes("áudio") || lower.includes("som") || lower.includes("música")) {
      reply = "Para áudio orgânico sem IA, tente gravar objetos cotidianos (foley) e modular pitch/EQ em um DAW gratuito como Audacity ou Reaper!";
    }
    const autoReply = {
      id: "gm-" + (Date.now() + 1),
      author: "Prof. João Pedro",
      role: "Professor · Mentoria ao Vivo",
      text: reply,
      ts: Date.now() + 200
    };
    this.data.gamedevHelp.mentorMessages.push(autoReply);
    this.save();
    return [item, autoReply];
  }

  toggleCourseModule(username, moduleId) {
    const k = keyOf(username) || "guest";
    this.data.courseProgress[k] = this.data.courseProgress[k] || [];
    const list = this.data.courseProgress[k];
    const idx = list.indexOf(moduleId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(moduleId);
    this.save();
    return list;
  }

  submitApplication(app) {
    const item = {
      id: "app-" + Date.now(),
      projectId: app.projectId,
      applicant: app.applicant,
      username: app.username || app.applicant,
      role: app.role,
      experienceLevel: app.experienceLevel || "Intermediário",
      availability: app.availability || "Flexível",
      resume: app.resume,
      portfolio: app.portfolio || "",
      skills: app.skills || "",
      status: "pending",
      ts: Date.now()
    };
    this.data.applications.unshift(item);
    this.save();
    return item;
  }

  resolveApplication(appId, status) {
    const app = this.data.applications.find((a) => a.id === appId);
    if (!app) return null;
    app.status = status;
    let updatedProj = null;
    if (status === "accepted") {
      const proj = this.data.projects.find((p) => p.id === app.projectId);
      if (proj && !proj.team.some((m) => m.name.toLowerCase() === app.applicant.toLowerCase())) {
        proj.team.push({
          name: app.applicant,
          role: app.role,
          social: app.portfolio || `@${app.username || app.applicant}`
        });
      }
      updatedProj = proj || null;
    }
    this.save();
    return { application: app, project: updatedProj };
  }

  recordCheckout({ buyer, item, amount, projectId }) {
    const numeric = Number(amount) || 0;
    if (projectId) {
      const proj = this.data.projects.find((p) => p.id === projectId);
      if (proj) proj.donated = Number((proj.donated + numeric).toFixed(2));
    }
    const sale = {
      buyer: buyer || "Sonhador",
      item,
      amount: numeric,
      date: new Date().toLocaleDateString("pt-BR")
    };
    this.data.salesHistory.unshift(sale);
    this.save();
    return sale;
  }
}

module.exports = { DreamoreDatabase, keyOf, createInitialData };
