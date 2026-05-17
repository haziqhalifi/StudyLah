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

export const INSURANS_SUBTOPICS: Subtopic[] = [
  {
    id: "3.1",
    title: "Risiko dan Perlindungan Insurans",
    meaning:
      "Subtopik ini menerangkan pengurusan risiko dan perlindungan kewangan melalui insurans.",
    relation: "Risiko ialah kemungkinan berlakunya musibah yang menyebabkan kerugian kewangan.",
    equation:
      "Konsep utama: risiko dipindahkan daripada individu kepada syarikat insurans melalui kontrak polisi.",
  },
  {
    id: "3.2",
    title: "Jenis Insurans",
    meaning:
      "Insurans hayat memberi manfaat kewangan apabila berlaku kematian, hilang upaya, atau penyakit kritikal.",
    relation:
      "Insurans am melindungi kerugian melibatkan harta benda dan liabiliti.",
    generalForm:
      "Contoh insurans am: insurans motor, kebakaran, perubatan dan kesihatan, kemalangan diri, dan perjalanan.",
  },
  {
    id: "3.3",
    title: "Istilah Penting dalam Pengiraan",
    meaning:
      "Premium ialah jumlah wang yang dibayar untuk mendapatkan perlindungan insurans.",
    equation:
      "Formula premium: $$\\text{Premium} = \\left(\\frac{\\text{Nilai Muka}}{\\text{RM }x}\\right) \\times \\text{Kadar Premium bagi setiap RM }x$$.",
    relation:
      "Deduktibel ialah amaun yang ditanggung sendiri sebelum pampasan dibayar oleh syarikat insurans.",
    generalForm:
      "Ko-insurans ialah perkongsian kos kerugian antara syarikat insurans dan pemegang polisi mengikut peratusan tertentu.",
  },
];

export const INSURANS_STEPS: JourneyStep[] = INSURANS_SUBTOPICS.flatMap((subtopic, index) => {
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
      task: "Nyatakan maksud, fungsi, atau tujuan insurans berdasarkan subtopik ini.",
      answer: "Semak definisi dan kaitan konsep dengan pengurusan risiko kewangan.",
    },
    {
      id: `${subtopic.id}-exercise-2`,
      no: baseNo + 3,
      subtopicId: subtopic.id,
      type: "Exercise",
      title,
      task: "Laksanakan pengiraan atau pilih jenis insurans yang sesuai berdasarkan situasi diberi.",
      answer: "Pastikan formula, istilah, dan alasan pilihan digunakan dengan tepat.",
    },
    {
      id: `${subtopic.id}-assessment`,
      no: baseNo + 4,
      subtopicId: subtopic.id,
      type: "Assessment",
      title,
      task: "Jawab soalan campuran konsep, jenis insurans, dan pengiraan.",
      answer: "Tumpukan pada ketepatan istilah, formula premium, serta tafsiran deduktibel dan ko-insurans.",
    },
  ];
});

