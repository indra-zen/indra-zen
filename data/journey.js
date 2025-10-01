export const JOURNEY = [
  {
    range: '2019-2020',
    label: 'Mulai SMK & Kenal Linux',
    points: [
      'Masuk SMKN 2 Tarakan (TKJ)',
      'Pertama kali belajar pemrograman (C++)',
      'Belajar sistem bilangan & gerbang logika',
      'Rakit PC & paham komponen',
      'Dasar jaringan: IP, MAC, Subnetting, crimping LAN',
      'Instalasi Windows & Linux (awal kenal Linux)',
      'Sedikit desain grafis (AI, PS)',
      'Bikin blog di Blogger → ketarik Web Dev'
    ]
  },
  {
    range: '2020-2021',
    label: 'Fondasi Web & Jaringan',
    points: [
      'Belajar HTML, CSS, JavaScript (otodidak)',
      'Simulasi jaringan (Cisco Packet Tracer)',
      'Wireless Mikrotik & Fiber Optik dasar',
      'UI Design (Adobe XD) seadanya',
      'Dual-boot Garuda Linux → wow factor'
    ]
  },
  {
    range: '2021-2022',
    label: 'Full Linux & Fullstack',
    points: [
      'Full migrate ke Linux (Manjaro)',
      'Project Moodle LMS + Proxmox (virtualization)',
      'Belajar React, Express, MongoDB, Git',
      'Administrasi server: SSH, DHCP, HTTP, FTP, VoIP',
      'Uji kompetensi: Wireless Hotspot Mikrotik',
      'Lulus SMK'
    ]
  },
  {
    range: 'Jul-Des 2022',
    label: 'Bootcamp Singkat & Freelance',
    points: [
      'Bootcamp Web Dev (1 bulan, berhenti karena biaya)',
      'Freelance sebentar tanpa portfolio kuat'
    ]
  },
  {
    range: '2023-Ags 2024',
    label: 'Belajar Intensif Mandiri',
    points: [
      'Nganggur tapi fokus belajar',
      'Next.js, SQL, PHP (Laravel), Docker, Cloud',
      'Ngoding via HP: VSCode Server di Termux',
      'Adaptasi keterbatasan perangkat'
    ]
  },
  {
    range: 'Sep 2024 →',
    label: 'Kuliah & Eksperimen Dalam',
    points: [
      'Kuliah Sistem Informasi',
      'Eksperimen distro, DE, filesystem, bootloader',
      'Custom & tweak kernel',
      'Mulai belajar Digital Forensic',
      'Tetap eksplor fullstack & Linux internals'
    ]
  }
];

export const BRAND = {
  alias: 'Zen',
  name: 'Indra Pranata',
  roles: [ 'Linux Enthusiast', 'Self-taught Web Dev', 'Digital Forensic Explorer' ],
  statement: 'Eksperimen adalah cara tercepat paham hal kompleks.'
};

export const COMMANDS = {
  help: {
    desc: 'Daftar command',
    action: () => Object.keys(COMMANDS).join('  ')
  },
  about: {
    desc: 'Info singkat',
    action: () => `${BRAND.alias} = ${BRAND.name}\n${BRAND.roles.join(' | ')}`
  },
  brand: {
    desc: 'Brand DNA',
    action: () => 'Linux-first, Eksploratif, Mandiri, Persisten, Curious'
  },
  journey: {
    desc: 'List rentang waktu',
    action: () => JOURNEY.map(j => j.range + ' :: ' + j.label).join('\n')
  },
  open: {
    desc: 'Detail rentang (usage: open 2021-2022)',
    action: (arg) => {
      const j = JOURNEY.find(j => j.range === arg);
      return j ? ('['+j.range+'] '+j.label+'\n- '+j.points.join('\n- ')) : 'Rentang tidak ditemukan';
    }
  },
  clear: {
    desc: 'Bersihkan layar',
    action: (arg, {clear}) => { clear(); return 'cleared.'; }
  },
  theme: {
    desc: 'Ganti tema (usage: theme arch|manjaro|garuda|void|fedora)',
    action: (arg, ctx) => ctx.setTheme(arg)
  },
  echo: {
    desc: 'Print teks (usage: echo sesuatu)',
    action: (arg) => arg || ''
  },
  // Easter eggs
  ls: { desc: '???', action: () => 'Try: help, journey, open <range>, theme <name>' },
  sudo: { desc: '???', action: () => 'Akses denied. (nice try)' },
  neofetch: { desc: 'Mini sistem info', action: () => 'ZenOS 0.1\nTheme:'+document.documentElement.dataset.theme+'\nShell: pseudo-console.js' }
};
