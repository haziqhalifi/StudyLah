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

export const MATRIKS_SUBTOPICS: Subtopic[] = [
  {
    id: "2.1",
    title: "Asas Matriks",
    meaning:
      "Matriks ialah susunan nombor dalam baris dan lajur yang membentuk jadual segi empat tepat.",
    relation: "Peringkat matriks ditulis sebagai $m \\times n$, dengan $m$ baris dan $n$ lajur.",
    equation: "Unsur $a_{ij}$ bermaksud unsur pada baris ke-$i$ dan lajur ke-$j$.",
    generalForm:
      "Dua matriks adalah sama jika peringkatnya sama dan setiap unsur sepadan adalah sama.",
  },
  {
    id: "2.2",
    title: "Operasi Asas Matriks",
    meaning:
      "Operasi asas termasuk penambahan, penolakan, pendaraban skalar, dan pendaraban matriks.",
    relation:
      "Penambahan dan penolakan hanya sah jika kedua-dua matriks mempunyai peringkat yang sama.",
    equation: "Pendaraban matriks: $$(m \\times n)(n \\times p) \\rightarrow (m \\times p)$$.",
    generalForm: "Pendaraban skalar mendarab setiap unsur matriks dengan satu nombor nyata.",
  },
  {
    id: "2.3",
    title: "Matriks Identiti dan Songsang",
    meaning:
      "Matriks identiti ialah matriks segi empat sama dengan 1 pada pepenjuru utama dan 0 pada unsur lain.",
    relation: "Sifat identiti: $$AI = IA = A$$.",
    equation: "Matriks songsang $A^{-1}$ memenuhi syarat $$AA^{-1} = A^{-1}A = I$$.",
    generalForm:
      "Untuk $$A = \\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix},\\quad A^{-1} = \\frac{1}{ad-bc}\\begin{bmatrix}d & -b \\\\ -c & a\\end{bmatrix}$$ dengan syarat $ad-bc \\neq 0$.",
  },
  {
    id: "2.4",
    title: "Persamaan Linear Serentak",
    meaning: "Matriks boleh digunakan untuk menyelesaikan persamaan linear serentak dalam bentuk $AX = B$.",
    equation: "Jika $A$ mempunyai songsang, maka penyelesaian ialah $$X = A^{-1}B$$.",
  },
];

export const MATRIKS_STEPS: JourneyStep[] = MATRIKS_SUBTOPICS.flatMap((subtopic, index) => {
  const baseNo = index * 4;
  const title = `${subtopic.id} ${subtopic.title}`;
  return [
    {
      id: `${subtopic.id}-content`,
      no: baseNo + 1,
      subtopicId: subtopic.id,
      type: "Content",
      title,
    },
    {
      id: `${subtopic.id}-exercise-1`,
      no: baseNo + 2,
      subtopicId: subtopic.id,
      type: "Exercise",
      title,
      task: "Nyatakan definisi, syarat operasi, atau hubungan penting bagi subtopik ini.",
      answer: "Semak semula peringkat matriks, unsur sepadan, dan syarat operasi yang betul.",
    },
    {
      id: `${subtopic.id}-exercise-2`,
      no: baseNo + 3,
      subtopicId: subtopic.id,
      type: "Exercise",
      title,
      task: "Lakukan pengiraan langkah demi langkah dan pastikan bentuk matriks akhir tepat.",
      answer: "Pastikan dimensi matriks serasi dan setiap operasi dibuat pada unsur yang betul.",
    },
    {
      id: `${subtopic.id}-assessment`,
      no: baseNo + 4,
      subtopicId: subtopic.id,
      type: "Assessment",
      title,
      task: "Selesaikan soalan campuran konsep dan pengiraan untuk subtopik ini.",
      answer: "Tumpukan pada syarat operasi, formula tepat, dan ketelitian susunan baris-lajur.",
    },
  ];
});

