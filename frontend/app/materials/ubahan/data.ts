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

export const UBAHAN_SUBTOPICS: Subtopic[] = [
  {
    id: "1.1",
    title: "Ubahan Langsung",
    meaning:
      "Hubungan di mana apabila satu pemboleh ubah y bertambah, maka pemboleh ubah x juga bertambah pada kadar yang sama dan sebaliknya.",
    relation: "Hubungan kadar: y ∝ xⁿ",
    equation: "Bentuk persamaan: y = kxⁿ, dengan k sebagai pemalar.",
    graph: "Graf y melawan xⁿ ialah garis lurus yang melalui asalan (0, 0).",
  },
  {
    id: "1.2",
    title: "Ubahan Songsang",
    meaning:
      "Hubungan di mana pemboleh ubah y bertambah apabila pemboleh ubah x berkurang pada kadar yang sama dan sebaliknya.",
    relation: "Hubungan kadar: y ∝ 1/xⁿ",
    equation: "Bentuk persamaan: y = k/xⁿ, dengan k sebagai pemalar.",
    graph:
      "Graf y melawan x berbentuk hiperbola. Graf y melawan (1/xⁿ) pula ialah garis lurus melalui asalan (0, 0).",
  },
  {
    id: "1.3",
    title: "Ubahan Bergabung",
    meaning: "Melibatkan gabungan ubahan langsung atau ubahan tercantum dan ubahan songsang.",
    generalForm: "Bentuk umum: y ∝ xᵐ/zⁿ, jadi persamaan ialah y = kxᵐ/zⁿ.",
  },
];

export const UBAHAN_STEPS: JourneyStep[] = UBAHAN_SUBTOPICS.flatMap((subtopic, index) => {
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
      prompt: `Kenal pasti bentuk ubahan bagi ${subtopic.title}.`,
      task: "Tentukan sama ada hubungan diberi sepadan dengan maksud dan bentuk persamaan subtopic ini.",
      answer: "Semak sama ada pemalar k kekal sama apabila nilai pemboleh ubah berubah.",
    },
    {
      id: `${subtopic.id}-exercise-2`,
      no: baseNo + 3,
      subtopicId: subtopic.id,
      type: "Exercise",
      title: `Exercise subtopic ${subtopic.id}`,
      prompt: `Gunakan formula ${subtopic.title} untuk mencari nilai tidak diketahui.`,
      task: "Cari k dahulu, kemudian gantikan nilai baru ke dalam persamaan ubahan.",
      answer: "Langkah utama: tulis hubungan ubahan, bentuk persamaan, cari k, dan jawab nilai yang diminta.",
    },
    {
      id: `${subtopic.id}-assessment`,
      no: baseNo + 4,
      subtopicId: subtopic.id,
      type: "Assessment",
      title: `Assessment subtopic ${subtopic.id}`,
      prompt: `Uji penguasaan ${subtopic.title}.`,
      task: "Selesaikan soalan bercampur yang melibatkan maksud, persamaan, dan tafsiran graf.",
      answer: "Layak terus ke subtopic seterusnya apabila jawapan menunjukkan bentuk ubahan dan nilai k yang betul.",
    },
  ];
});

