export type StepType = "Content" | "Exercise" | "Assessment";

export type Subtopic = {
  id: string;
  title: string;
  meaning: string;
  relation?: string;
  equation?: string;
  graph?: string;
  generalForm?: string;
};

export type JourneyStep = {
  id: string;
  no: number;
  subtopicId: string;
  type: StepType;
  title: string;
  prompt?: string;
  task?: string;
  answer?: string;
};

export type MaterialMcq = {
  id: string;
  subtopicId: string;
  text: string;
  options: string[];
  answerIndex: number;
  difficulty: "Mudah" | "Sederhana" | "Susah";
};

export const UBAHAN_SUBTOPICS: Subtopic[] = [
  {
    id: "1.1",
    title: "Ubahan Langsung",
    meaning:
      "Hubungan apabila $y$ berubah seiring dengan $x$. Jika $x$ meningkat, $y$ juga meningkat pada kadar yang berkadar terus.",
    relation: "Hubungan kadar: $y$ berkadar terus dengan $x^n$.",
    equation: "Bentuk persamaan: $$y = kx^n$$ dengan $k$ ialah pemalar.",
    graph: "Graf $y$ melawan $x^n$ ialah garis lurus melalui asalan $(0,0)$.",
  },
  {
    id: "1.2",
    title: "Ubahan Songsang",
    meaning:
      "Hubungan apabila $y$ meningkat semasa $x$ menurun, atau $y$ menurun semasa $x$ meningkat.",
    relation: "Hubungan kadar: $y$ berkadar songsang dengan $x^n$.",
    equation: "Bentuk persamaan: $$y = \\frac{k}{x^n}$$ dengan $k$ ialah pemalar.",
    graph:
      "Graf $y$ melawan $x$ berbentuk hiperbola. Graf $y$ melawan $\\left(\\frac{1}{x^n}\\right)$ ialah garis lurus melalui asalan.",
  },
  {
    id: "1.3",
    title: "Ubahan Bergabung",
    meaning:
      "Gabungan ubahan langsung dengan ubahan songsang dalam satu hubungan yang sama.",
    generalForm:
      "Bentuk umum: $y$ berkadar terus dengan $x^p$ dan berkadar songsang dengan $z^n$, jadi $$y = \\frac{kx^p}{z^n}$$.",
  },
];

export const UBAHAN_STEPS: JourneyStep[] = [
  {
    id: "1.1-content",
    no: 1,
    subtopicId: "1.1",
    type: "Content",
    title: "1.1 Ubahan Langsung",
  },
  {
    id: "1.1-exercise",
    no: 2,
    subtopicId: "1.1",
    type: "Exercise",
    title: "1.1 Ubahan Langsung",
  },
  {
    id: "1.2-content",
    no: 3,
    subtopicId: "1.2",
    type: "Content",
    title: "1.2 Ubahan Songsang",
  },
  {
    id: "1.2-exercise",
    no: 4,
    subtopicId: "1.2",
    type: "Exercise",
    title: "1.2 Ubahan Songsang",
  },
  {
    id: "1.3-content",
    no: 5,
    subtopicId: "1.3",
    type: "Content",
    title: "1.3 Ubahan Bergabung",
  },
  {
    id: "1.3-exercise",
    no: 6,
    subtopicId: "1.3",
    type: "Exercise",
    title: "1.3 Ubahan Bergabung",
  },
  {
    id: "ubahan-final-exam",
    no: 7,
    subtopicId: "1.3",
    type: "Assessment",
    title: "Peperiksaan Ubahan",
  },
];

export const UBAHAN_QUESTION_BANK: MaterialMcq[] = [
  {
    id: "1.1-q1",
    subtopicId: "1.1",
    text: "Diberi bahawa $t$ berubah secara langsung dengan punca kuasa dua $s$ dan $t=24$ apabila $s=9$. Ungkapkan $t$ dalam sebutan $s$.",
    options: ["$t=8\\sqrt{s}$", "$t=3s^2$", "$t=\\frac{24}{s}$", "$t=24s^2$"],
    answerIndex: 0,
    difficulty: "Mudah",
  },
  {
    id: "1.1-q2",
    subtopicId: "1.1",
    text: "Jadual menunjukkan hubungan langsung antara $H$ dan $K$: $H=30$ apabila $K=5$, dan $H=42$ apabila $K=7$. Antara yang berikut, yang manakah betul?",
    options: ["$H=K^2$", "$H=6K$", "$H=\\frac{K}{6}$", "$H=K+25$"],
    answerIndex: 1,
    difficulty: "Mudah",
  },
  {
    id: "1.1-q3",
    subtopicId: "1.1",
    text: "Diberi bahawa $Y$ berubah secara langsung dengan kuasa dua $X$. Cari hubungan antara $Y$ dengan $X$.",
    options: ["$Y=k\\sqrt{X}$", "$Y=kX^2$", "$Y=\\frac{k}{\\sqrt{X}}$", "$Y=\\frac{k}{X^2}$"],
    answerIndex: 1,
    difficulty: "Mudah",
  },
  {
    id: "1.1-q4",
    subtopicId: "1.1",
    text: "Diberi bahawa $m \\propto n$. Apakah yang berlaku pada nilai $m$ jika nilai $n$ bertambah sebanyak $25\\%$?",
    options: ["Bertambah sebanyak $25\\%$", "Bertambah sebanyak $50\\%$", "Berkurang sebanyak $25\\%$", "Berkurang sebanyak $50\\%$"],
    answerIndex: 0,
    difficulty: "Sederhana",
  },
  {
    id: "1.1-q5",
    subtopicId: "1.1",
    text: "Diberi bahawa $x$ berubah secara langsung dengan kuasa dua $y$ dan $x=36$ apabila $y=3$. Ungkapkan $x$ dalam sebutan $y$.",
    options: ["$x=2y^2$", "$x=4y^2$", "$x=12y^2$", "$x=18y^2$"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.1-q6",
    subtopicId: "1.1",
    text: "Jika $y$ berubah secara langsung dengan $x$ dan $y=10$ apabila $x=4$, apakah nilai $y$ apabila $x=6$?",
    options: ["12", "15", "20", "25"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.1-q7",
    subtopicId: "1.1",
    text: "Jarak yang dilalui pelari, $p$ km, berubah secara langsung dengan masa, $t$ minit. Diberi pelari mencapai $5$ km dalam $30$ minit. Ungkapkan $p$ dalam sebutan $t$.",
    options: ["$p=6t$", "$p=\\frac{1}{6}t$", "$p=30t$", "$p=150t$"],
    answerIndex: 1,
    difficulty: "Mudah",
  },
  {
    id: "1.1-q8",
    subtopicId: "1.1",
    text: "Diberi $E$ berubah secara langsung dengan kuasa tiga $F$. Jika $E=24$ apabila $F=2$, hitung nilai $E$ apabila $F=3$.",
    options: ["27", "81", "9", "1"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.1-q9",
    subtopicId: "1.1",
    text: "Luas segi empat tepat, $B$, berubah secara langsung dengan lebarnya, $l$. Jika lebar bertambah $10\\%$, apakah perubahan pada luas?",
    options: ["Berkurang $10\\%$", "Kekal sama", "Bertambah $10\\%$", "Bertambah $20\\%$"],
    answerIndex: 2,
    difficulty: "Mudah",
  },
  {
    id: "1.1-q10",
    subtopicId: "1.1",
    text: "Diberi $p=0.5$ apabila $q=1.5$. Hitung nilai $p$ apabila $q=6$ jika $p \\propto q^2$.",
    options: ["2", "4", "8", "16"],
    answerIndex: 2,
    difficulty: "Sederhana",
  },

  {
    id: "1.2-q1",
    subtopicId: "1.2",
    text: "Diberi bahawa $p \\propto \\frac{1}{q}$ dan $p=3$ apabila $q=2$. Cari nilai $p$ apabila $q=-5$.",
    options: ["$-5$", "$-6$", "$\\frac{5}{6}$", "$-\\frac{6}{5}$"],
    answerIndex: 3,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q2",
    subtopicId: "1.2",
    text: "$P$ berubah secara songsang dengan kuasa dua $Q$ dan $Q=2$ apabila $P=2$. Cari nilai $P$ apabila $Q=4$.",
    options: ["$\\frac{1}{2}$", "$\\frac{1}{32}$", "1", "$\\frac{1}{8}$"],
    answerIndex: 0,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q3",
    subtopicId: "1.2",
    text: "Diberi bahawa $m \\propto \\frac{1}{n}$ dan $m=12$ apabila $n=\\frac{1}{4}$. Cari nilai $m$ apabila $n=4$.",
    options: ["$\\frac{1}{3}$", "3", "12", "24"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q4",
    subtopicId: "1.2",
    text: "$R$ berubah secara songsang dengan kuasa tiga $S$. Diberi $R=32$ apabila $S=\\frac{1}{4}$. Hitung nilai $S$ apabila $R=\\frac{1}{2}$.",
    options: ["$\\frac{1}{2}$", "$\\frac{1}{4}$", "1", "2"],
    answerIndex: 2,
    difficulty: "Susah",
  },
  {
    id: "1.2-q5",
    subtopicId: "1.2",
    text: "Diberi bahawa $R^2T=k$, dengan $k$ pemalar. Pernyataan manakah yang benar?",
    options: ["$T$ berubah secara langsung dengan $R^2$", "$T$ berubah secara songsang dengan $R^2$", "$T$ berubah secara langsung dengan $\\sqrt{R}$", "$T$ berubah secara songsang dengan $\\sqrt{R}$"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q6",
    subtopicId: "1.2",
    text: "Jika $PQ^2=k$, dengan $k$ pemalar, hubungan manakah yang benar?",
    options: ["$P \\propto Q^2$", "$P \\propto \\frac{1}{Q}$", "$P \\propto \\frac{1}{Q^2}$", "$P \\propto \\frac{1}{\\sqrt{Q}}$"],
    answerIndex: 2,
    difficulty: "Mudah",
  },
  {
    id: "1.2-q7",
    subtopicId: "1.2",
    text: "$q$ berubah secara songsang dengan $\\sqrt{p}$. Cari hubungan antara $p$ dan $q$ jika $p=9$ dan $q=12$.",
    options: ["$q=4\\sqrt{p}$", "$q=\\frac{36}{\\sqrt{p}}$", "$q=\\frac{4}{\\sqrt{p}}$", "$q=36\\sqrt{p}$"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q8",
    subtopicId: "1.2",
    text: "Bilangan hadiah yang boleh dibeli dengan jumlah wang tetap berubah secara songsang dengan harga satu hadiah. Jika harga asal RM10 boleh beli 10 hadiah, berapakah hadiah boleh beli jika harga berkurang 50%?",
    options: ["5", "15", "20", "25"],
    answerIndex: 2,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q9",
    subtopicId: "1.2",
    text: "Diberi $y$ berubah secara songsang dengan $x^2$ dan $y=5$ apabila $x=2$. Cari nilai $y$ apabila $x=10$.",
    options: ["0.2", "0.5", "1", "2"],
    answerIndex: 0,
    difficulty: "Sederhana",
  },
  {
    id: "1.2-q10",
    subtopicId: "1.2",
    text: "Manakah graf yang mewakili ubahan songsang $y \\propto \\frac{1}{x}$?",
    options: ["Garis lurus melalui asalan", "Garis lurus tidak melalui asalan", "Lengkung yang tidak menyentuh paksi-$x$ dan paksi-$y$", "Garis mengufuk"],
    answerIndex: 2,
    difficulty: "Mudah",
  },

  {
    id: "1.3-q1",
    subtopicId: "1.3",
    text: "$W$ berubah secara langsung dengan $X$ dan secara songsang dengan $\\sqrt{Y}$. Cari hubungan tersebut.",
    options: ["$W=\\frac{kX}{\\sqrt{Y}}$", "$W=kX\\sqrt{Y}$", "$W=\\frac{k\\sqrt{Y}}{X}$", "$W=kXY^{1/2}$"],
    answerIndex: 0,
    difficulty: "Mudah",
  },
  {
    id: "1.3-q2",
    subtopicId: "1.3",
    text: "Diberi $Y \\propto XZ$. Cari nilai $m$ jika $(X=6,Y=36,Z=9)$ dan $(X=4,Y=m,Z=12)$.",
    options: ["20", "24", "32", "48"],
    answerIndex: 2,
    difficulty: "Sederhana",
  },
  {
    id: "1.3-q3",
    subtopicId: "1.3",
    text: "Diberi $v \\propto \\frac{r^x}{s^y}$ dan $v$ berubah secara langsung dengan $r^3$ dan songsang dengan $\\sqrt{s}$. Nyatakan nilai $x$ dan $y$.",
    options: ["$x=3, y=\\frac{1}{2}$", "$x=3, y=-\\frac{1}{2}$", "$x=\\frac{1}{3}, y=2$", "$x=\\frac{1}{3}, y=-2$"],
    answerIndex: 0,
    difficulty: "Mudah",
  },
  {
    id: "1.3-q4",
    subtopicId: "1.3",
    text: "$U$ berubah secara langsung dengan $V^2$ dan secara songsang dengan $\\sqrt{W}$. Hubungan manakah yang betul?",
    options: ["$U \\propto \\frac{V^2}{\\sqrt{W}}$", "$U \\propto \\frac{\\sqrt{W}}{V^2}$", "$U \\propto \\frac{W^2}{V}$", "$U \\propto \\frac{V}{W^2}$"],
    answerIndex: 0,
    difficulty: "Mudah",
  },
  {
    id: "1.3-q5",
    subtopicId: "1.3",
    text: "Diberi $w \\propto \\frac{u^3}{\\sqrt{v}}$. Jika $v=16$, $u=2$ dan $w=3$, cari pemalar $k$.",
    options: ["3", "6", "8", "12"],
    answerIndex: 1,
    difficulty: "Sederhana",
  },
  {
    id: "1.3-q6",
    subtopicId: "1.3",
    text: "Jarak $s$ berubah secara langsung dengan $v^2$ dan secara songsang dengan $a$. Diberi $s=120, v=6, a=0.5$. Hitung $a$ apabila $s=360, v=9$.",
    options: ["0.375", "0.5", "1.25", "2.0"],
    answerIndex: 0,
    difficulty: "Susah",
  },
  {
    id: "1.3-q7",
    subtopicId: "1.3",
    text: "Masa $T$ berubah secara langsung dengan panjang jalan $L$ dan secara songsang dengan bilangan pekerja $W$. Jika 6 pekerja menurap 30 km dalam 10 hari, berapakah pekerja diperlukan untuk 90 km dalam 9 hari?",
    options: ["15", "18", "20", "24"],
    answerIndex: 2,
    difficulty: "Susah",
  },
  {
    id: "1.3-q8",
    subtopicId: "1.3",
    text: "Diberi $M$ berubah secara langsung dengan $\\sqrt{N}$ dan secara songsang dengan $G^3$. Diberi $N=4, G=2, M=1$. Cari $M$ apabila $N=9, G=3$.",
    options: ["$\\frac{2}{9}$", "$\\frac{1}{3}$", "$\\frac{4}{9}$", "$\\frac{1}{2}$"],
    answerIndex: 2,
    difficulty: "Sederhana",
  },
  {
    id: "1.3-q9",
    subtopicId: "1.3",
    text: "Diberi $P$ berubah secara langsung dengan $Q$ dan secara songsang dengan $R$. Jika $P$ meningkat 20% dan $Q$ meningkat 20%, apakah yang berlaku pada $R$?",
    options: ["$R$ bertambah 20%", "$R$ berkurang 20%", "$R$ kekal sama", "$R$ bertambah 40%"],
    answerIndex: 2,
    difficulty: "Susah",
  },
  {
    id: "1.3-q10",
    subtopicId: "1.3",
    text: "Diberi $x \\propto \\frac{z}{y^2}$. Cari nilai $m$ jika $(x=9,y=3,z=2)$ dan $(x=5,y=m,z=10)$.",
    options: ["3", "4", "5", "6"],
    answerIndex: 2,
    difficulty: "Sederhana",
  },
];
