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
  prompt: string;
  task?: string;
  answer?: string;
};

export const MATRIKS_SUBTOPICS: Subtopic[] = [
  {
    id: "2.1",
    title: "Asas Matriks",
    meaning:
      "Matriks ialah set nombor yang disusun dalam baris dan lajur untuk membentuk satu tatasusun segi empat tepat atau segi empat sama.",
    relation: "Peringkat matriks ditulis sebagai m × n (m baris, n lajur).",
    equation: "Unsur aᵢⱼ bermaksud unsur pada baris ke-i dan lajur ke-j.",
    generalForm:
      "Matriks sama berlaku apabila dua matriks mempunyai peringkat yang sama dan setiap unsur sepadan adalah sama.",
  },
  {
    id: "2.2",
    title: "Operasi Asas Matriks",
    meaning:
      "Operasi asas melibatkan penambahan, penolakan, pendaraban skalar, dan pendaraban dua matriks.",
    relation:
      "Penambahan dan penolakan hanya boleh dilakukan jika kedua-dua matriks mempunyai peringkat yang sama.",
    equation:
      "Pendaraban matriks: (m × n)(n × p) = (m × p).",
    generalForm: "Pendaraban skalar mendarab setiap unsur matriks dengan suatu nombor nyata.",
  },
  {
    id: "2.3",
    title: "Matriks Identiti dan Songsang",
    meaning:
      "Matriks identiti ialah matriks segi empat sama dengan 1 pada pepenjuru utama dan 0 pada unsur lain.",
    relation: "Sifat identiti: AI = IA = A.",
    equation:
      "Matriks songsang A⁻¹ memenuhi syarat AA⁻¹ = A⁻¹A = I.",
    generalForm:
      "Untuk A = [[a, b], [c, d]], A⁻¹ = (1/(ad - bc))[[d, -b], [-c, a]], dengan syarat ad - bc ≠ 0.",
  },
  {
    id: "2.4",
    title: "Persamaan Linear Serentak",
    meaning: "Matriks digunakan untuk menyelesaikan persamaan linear serentak dalam bentuk AX = B.",
    equation: "Jika A boleh disongsangkan, penyelesaian ialah X = A⁻¹B.",
  },
];

export const MATRIKS_STEPS: JourneyStep[] = MATRIKS_SUBTOPICS.flatMap((subtopic, index) => {
  const baseNo = index * 4;
  return [
    {
      id: `${subtopic.id}-content`,
      no: baseNo + 1,
      subtopicId: subtopic.id,
      type: "Content",
      title: `Learning content subtopic ${subtopic.id}`,
      prompt: `Baca dan fahami konsep ${subtopic.title}.`,
    },
    {
      id: `${subtopic.id}-exercise-1`,
      no: baseNo + 2,
      subtopicId: subtopic.id,
      type: "Exercise",
      title: `Exercise subtopic ${subtopic.id}`,
      prompt: `Kenal pasti konsep utama bagi ${subtopic.title}.`,
      task: "Tentukan syarat, definisi, atau hubungan penting berdasarkan subtopic ini.",
      answer: "Semak semula peringkat matriks, unsur sepadan, atau syarat operasi yang betul.",
    },
    {
      id: `${subtopic.id}-exercise-2`,
      no: baseNo + 3,
      subtopicId: subtopic.id,
      type: "Exercise",
      title: `Exercise subtopic ${subtopic.id}`,
      prompt: `Gunakan kaedah ${subtopic.title} untuk menyelesaikan soalan.`,
      task: "Laksanakan pengiraan langkah demi langkah dan semak ketepatan bentuk matriks hasil.",
      answer: "Pastikan dimensi matriks serasi dan operasi dilakukan pada unsur yang betul.",
    },
    {
      id: `${subtopic.id}-assessment`,
      no: baseNo + 4,
      subtopicId: subtopic.id,
      type: "Assessment",
      title: `Assessment subtopic ${subtopic.id}`,
      prompt: `Uji penguasaan ${subtopic.title}.`,
      task: "Selesaikan soalan campuran konsep dan pengiraan bagi subtopic ini.",
      answer: "Fokus pada syarat operasi, formula tepat, dan ketelitian susunan baris-lajur.",
    },
  ];
});

