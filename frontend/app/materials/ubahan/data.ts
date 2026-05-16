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
    relation: "y berkadar terus dengan x^n.",
    equation: "y = kx^n, dengan keadaan k ialah pemalar.",
    graph: "Graf y melawan x^n ialah satu garis lurus yang melalui asalan.",
  },
  {
    id: "1.2",
    title: "Ubahan Songsang",
    meaning:
      "Hubungan di mana pemboleh ubah y bertambah apabila pemboleh ubah x berkurang pada kadar yang sama dan sebaliknya.",
    relation: "y berkadar songsang dengan x^n.",
    equation: "y = k / x^n, dengan keadaan k ialah pemalar.",
    graph:
      "Graf y melawan x berbentuk hiperbola, manakala graf y melawan 1 / x^n ialah satu garis lurus yang bermula daripada asalan.",
  },
  {
    id: "1.3",
    title: "Ubahan Bergabung",
    meaning: "Melibatkan gabungan ubahan langsung atau ubahan tercantum dan ubahan songsang.",
    generalForm: "Bentuk umum: y berkadar dengan x^m / z^n atau y = kx^m / z^n.",
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

