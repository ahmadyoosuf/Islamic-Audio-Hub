import type { Category, Track } from "@/context/AppContext";

export const CATEGORIES: Category[] = [
  {
    id: "quran",
    name: "குர்ஆன் விளக்கம்",
    trackCount: 11,
    icon: "book",
    color: "#c8a84b",
    thumbnailUrl: undefined,
  },
  {
    id: "hadith",
    name: "ஹதீஸ் விளக்கம்",
    trackCount: 20,
    icon: "document-text",
    color: "#4ade80",
    thumbnailUrl: undefined,
  },
  {
    id: "iman",
    name: "ஈமான் அடிப்படைகள்",
    trackCount: 37,
    icon: "heart",
    color: "#60a5fa",
    thumbnailUrl: undefined,
  },
  {
    id: "seerah",
    name: "நபி வரலாறு",
    trackCount: 9,
    icon: "star",
    color: "#f472b6",
    thumbnailUrl: undefined,
  },
  {
    id: "daily",
    name: "அன்றாட வழிகாட்டி",
    trackCount: 29,
    icon: "sunny",
    color: "#fb923c",
    thumbnailUrl: undefined,
  },
];

const generateTracks = (
  categoryId: string,
  categoryName: string,
  count: number,
  titles: string[],
  prizeEnabledIds: number[] = [],
): Track[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${categoryId}-${i + 1}`,
    title: titles[i] ?? `${categoryName} - பகுதி ${i + 1}`,
    categoryId,
    categoryName,
    duration: 600 + Math.floor(Math.random() * 1800),
    audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`,
    viewCount: Math.floor(Math.random() * 5000),
    isPremium: i > 2,
    sortOrder: i + 1,
    prizeEnabled: prizeEnabledIds.includes(i + 1),
  }));

export const TRACKS_BY_CATEGORY: Record<string, Track[]> = {
  quran: generateTracks("quran", "குர்ஆன் விளக்கம்", 11, [
    "அல்-ஃபாத்திஹா விளக்கம்",
    "அல்-பகரா - பகுதி 1",
    "அல்-பகரா - பகுதி 2",
    "ஆல்-இம்ரான் விளக்கம்",
    "அன்-நிஸா விளக்கம்",
    "அல்-மாயிதா விளக்கம்",
    "அல்-அன்ஆம் விளக்கம்",
    "அல்-அஃராஃப் விளக்கம்",
    "அல்-அன்ஃபால் விளக்கம்",
    "அத்-தவ்பா விளக்கம்",
    "யூனுஸ் விளக்கம்",
  ]),
  hadith: generateTracks("hadith", "ஹதீஸ் விளக்கம்", 20, [
    "நபி (ஸல்) குணநலன்கள்",
    "நம்பிக்கையின் அடிப்படை",
    "தொழுகையின் சிறப்பு",
    "ஜகாத்தின் முக்கியத்துவம்",
    "நோன்பின் சிறப்புகள்",
    "ஹஜ்ஜின் சிறப்புகள்",
    "குடும்பத்தின் கடமைகள்",
    "அண்டை வீட்டாரின் உரிமைகள்",
    "அறிவின் முக்கியத்துவம்",
    "பொய் சொல்வதன் தீமை",
    "உண்மையின் மகத்துவம்",
    "பொறுமையின் சிறப்பு",
    "நன்றி செலுத்துதல்",
    "அல்லாஹ்வில் நம்பிக்கை",
    "துஆவின் சிறப்பு",
    "இஸ்திஃபாரின் முக்கியத்துவம்",
    "தர்மத்தின் சிறப்பு",
    "அன்பின் முக்கியத்துவம்",
    "மன்னிப்பின் சிறப்பு",
    "இறுதி நாளின் அடையாளங்கள்",
  ]),
  iman: generateTracks("iman", "ஈமான் அடிப்படைகள்", 15, [
    "தவ்ஹீத் - ஏகத்துவம்",
    "அல்லாஹ்வின் பெயர்கள் - பகுதி 1",
    "அல்லாஹ்வின் பெயர்கள் - பகுதி 2",
    "வானவர்களில் நம்பிக்கை",
    "வேதங்களில் நம்பிக்கை",
    "தூதர்களில் நம்பிக்கை",
    "இறுதி நாளில் நம்பிக்கை",
    "ஷிர்க்கின் தீமைகள்",
    "ஐந்து தூண்களின் விளக்கம்",
    "இஸ்லாமிய நம்பிக்கையின் ஆதாரங்கள்",
    "அர்ஷ்மான் ஸிஃபாத்",
    "பிர்தவ்ஸின் விளக்கம்",
    "ஜஹன்னமின் விளக்கம்",
    "ஹஷ்ரின் விளக்கம்",
    "அஸ்மாவுல் ஹுஸ்னா - அறிமுகம்",
  ]),
  seerah: generateTracks("seerah", "நபி வரலாறு", 9, [
    "நபி (ஸல்) பிறப்பு",
    "இளமை காலம்",
    "வஹீயின் ஆரம்பம்",
    "மக்கா கால வரலாறு",
    "ஹிஜ்ரத் நிகழ்வு",
    "மதீனா கால வரலாறு",
    "பத்ர் போர்",
    "உஹுத் போர்",
    "மக்கா வெற்றி",
  ]),
  daily: generateTracks("daily", "அன்றாட வழிகாட்டி", 15, [
    "காலை துஆக்கள்",
    "இரவு துஆக்கள்",
    "உணவு உண்ணும் போது",
    "பயணத்தின் போது",
    "தொழுகைக்கு முன்",
    "தொழுகைக்கு பின்",
    "குர்ஆன் ஓதுவதற்கு முன்",
    "வீட்டை விட்டு வெளியேறும் போது",
    "வீட்டிற்கு நுழையும் போது",
    "தூக்கத்திற்கு முன்",
    "தூக்கத்திலிருந்து எழும் போது",
    "கஷ்டங்களில் துஆ",
    "மழை பெய்யும் போது",
    "திருமண வாழ்வில் துஆ",
    "நோயாளிக்கு துஆ",
  ]),
};

export const TRACKS: Track[] = Object.values(TRACKS_BY_CATEGORY).flat();

export const getAllTracks = (): Track[] => TRACKS;

export const getTracksByCategory = (categoryId: string): Track[] =>
  TRACKS_BY_CATEGORY[categoryId] ?? [];

export const getTrackById = (id: string): Track | undefined =>
  getAllTracks().find((t) => t.id === id);

export const getMostPopular = (): Track[] =>
  getAllTracks()
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

export const getTodaysFreeTrack = (): Track => {
  const all = getAllTracks().filter((t) => !t.isPremium);
  const idx = new Date().getDate() % all.length;
  return all[idx];
};

export const getLatestByCategory = (): { category: Category; track: Track }[] =>
  CATEGORIES.map((cat) => {
    const tracks = TRACKS_BY_CATEGORY[cat.id] ?? [];
    return { category: cat, track: tracks[tracks.length - 1] };
  }).filter((x) => x.track);

export const QUIZ_QUESTIONS: Record<
  string,
  Array<{
    question: string;
    options: [string, string, string];
    correctIndex: number;
  }>
> = {
  "quran-1": [
    {
      question: "அல்-ஃபாத்திஹா சூரா எத்தனை வசனங்களைக் கொண்டது?",
      options: ["5", "7", "9"],
      correctIndex: 1,
    },
    {
      question: "குர்ஆனில் மொத்தம் எத்தனை சூராக்கள் உள்ளன?",
      options: ["100", "114", "120"],
      correctIndex: 1,
    },
    {
      question: "குர்ஆனின் முதல் வசனம் எது?",
      options: [
        "அல்ஹம்துலில்லாஹ்",
        "பிஸ்மில்லாஹிர் ரஹ்மானிர் ரஹீம்",
        "இன்னல்லாஹ",
      ],
      correctIndex: 1,
    },
    {
      question: "அல்-ஃபாத்திஹா என்ன பொருள்?",
      options: ["திறப்பு", "முடிவு", "நடு"],
      correctIndex: 0,
    },
    {
      question: "குர்ஆன் எந்த மொழியில் இறக்கியருளப்பட்டது?",
      options: ["தமிழ்", "அரபி", "உர்துள்"],
      correctIndex: 1,
    },
  ],
  "quran-2": [
    {
      question: "அல்-பகரா சூரா என்ன பொருள்?",
      options: ["பசு", "ஆடு", "ஒட்டகம்"],
      correctIndex: 0,
    },
    {
      question: "குர்ஆனில் மிக நீளமான சூரா எது?",
      options: ["அல்-இம்ரான்", "அல்-பகரா", "யாஸீன்"],
      correctIndex: 1,
    },
    {
      question: "ஆயத்துல் குர்ஸி எந்த சூராவில் உள்ளது?",
      options: ["அல்-ஃபாத்திஹா", "அல்-பகரா", "அல்-இம்ரான்"],
      correctIndex: 1,
    },
    {
      question: "குர்ஆனில் எத்தனை ஜுஸ்கள் உள்ளன?",
      options: ["20", "30", "40"],
      correctIndex: 1,
    },
    {
      question: "குர்ஆன் எத்தனை ஆண்டுகளாக இறக்கியருளப்பட்டது?",
      options: ["20", "23", "25"],
      correctIndex: 1,
    },
  ],
  "hadith-1": [
    {
      question: "ஹதீஸ் என்பது என்ன?",
      options: [
        "குர்ஆனின் வசனம்",
        "நபி (ஸல்) அவர்களின் வழிமுறை",
        "ஒரு இஸ்லாமிய நூல்",
      ],
      correctIndex: 1,
    },
    {
      question: "சஹீஹ் புகாரி யார் தொகுத்தார்?",
      options: ["இமாம் முஸ்லிம்", "இமாம் புகாரி", "இமாம் திர்மிதி"],
      correctIndex: 1,
    },
    {
      question: "ஹதீஸ் தொகுப்பாளர்களில் மிகவும் புகழ்பெற்றவர் யார்?",
      options: ["இமாம் அஹ்மது", "இமாம் புகாரி", "இமாம் மாலிக்"],
      correctIndex: 1,
    },
    {
      question: "இஸ்லாமின் ஐந்து தூண்களில் முதலாவது எது?",
      options: ["தொழுகை", "கலிமா", "ஜகாத்"],
      correctIndex: 1,
    },
    {
      question: "தினசரி தொழுகை எத்தனை நேரங்கள்?",
      options: ["3", "5", "7"],
      correctIndex: 1,
    },
  ],
  "hadith-2": [
    {
      question: "நம்பிக்கை (ஈமான்) என்பதில் எத்தனை கட்டங்கள் உள்ளன?",
      options: ["4", "6", "8"],
      correctIndex: 1,
    },
    {
      question: "இஸ்லாத்தில் ஷஹாதத்தின் பொருள் என்ன?",
      options: ["நோன்பு", "சாட்சி", "தொழுகை"],
      correctIndex: 1,
    },
    {
      question: "ஈமானின் ஆறு தூண்களில் முதலாவது எது?",
      options: ["தூதர்களில் நம்பிக்கை", "அல்லாஹ்வில் நம்பிக்கை", "வானவர்களில் நம்பிக்கை"],
      correctIndex: 1,
    },
    {
      question: "ஜிப்ரீல் ஹதீஸ் எதைப் பற்றி பேசுகிறது?",
      options: ["ஹஜ்", "ஈமான், இஸ்லாம், இஹ்ஸான்", "ஜிஹாத்"],
      correctIndex: 1,
    },
    {
      question: "குஃப்ர் என்ன பொருள்?",
      options: ["நம்பிக்கை", "நிராகரிப்பு", "வணக்கம்"],
      correctIndex: 1,
    },
  ],
  "iman-1": [
    {
      question: "தவ்ஹீத் என்ன பொருள்?",
      options: ["பல தெய்வங்கள்", "ஒரே கடவுள்", "கடவுள் இல்லை"],
      correctIndex: 1,
    },
    {
      question: "அல்லாஹ்வின் 99 பெயர்களை என்ன அழைப்பர்?",
      options: ["அஸ்மாவுல் ஹுஸ்னா", "அஸ்மாவுல் குர்ஆன்", "அஸ்மாவுல் நபி"],
      correctIndex: 0,
    },
    {
      question: "இஸ்லாமில் ஷிர்க் என்பது என்ன?",
      options: ["நல்ல செயல்", "அல்லாஹ்விற்கு இணை வைத்தல்", "நோன்பு"],
      correctIndex: 1,
    },
    {
      question: "தவ்ஹீதின் வகைகள் எத்தனை?",
      options: ["2", "3", "4"],
      correctIndex: 1,
    },
    {
      question: "ரூபூபிய்யா என்ன பொருள்?",
      options: ["வணக்கம்", "இறையாண்மை", "பெயர்கள்"],
      correctIndex: 1,
    },
  ],
  "seerah-1": [
    {
      question: "நபி முஹம்மது (ஸல்) அவர்கள் எந்த நகரில் பிறந்தார்கள்?",
      options: ["மதீனா", "மக்கா", "தாயிஃப்"],
      correctIndex: 1,
    },
    {
      question: "நபி (ஸல்) எந்த ஆண்டில் பிறந்தார்கள்?",
      options: ["570 CE", "610 CE", "580 CE"],
      correctIndex: 0,
    },
    {
      question: "நபி (ஸல்) அவர்களின் தந்தையின் பெயர் என்ன?",
      options: ["அபூ தாலிப்", "அப்துல்லாஹ்", "அப்துல் முத்தலிப்"],
      correctIndex: 1,
    },
    {
      question: "நபி (ஸல்) அவர்களின் தாயின் பெயர் என்ன?",
      options: ["ஃபாத்திமா", "ஆமினா", "ஹலீமா"],
      correctIndex: 1,
    },
    {
      question: "வஹீ முதலில் எந்த சூராவிலிருந்து தொடங்கியது?",
      options: ["அல்-ஃபாத்திஹா", "அல்-அலக்", "அல்-பகரா"],
      correctIndex: 1,
    },
  ],
  "daily-1": [
    {
      question: "காலையில் எழுந்திரிக்கும் போது என்ன துஆ படிக்க வேண்டும்?",
      options: ["அல்ஹம்துலில்லாஹ்", "அல்ஹம்துலில்லாஹில்லதி அஹ்யானா", "பிஸ்மில்லாஹ்"],
      correctIndex: 1,
    },
    {
      question: "காலை நேரம் என்றால் எந்த நேரம்?",
      options: ["மதியம்", "சூரியோதயத்திற்கு முன்", "மாலை"],
      correctIndex: 1,
    },
    {
      question: "காலை துஆவில் என்ன கேட்கப்படுகிறது?",
      options: ["செல்வம்", "பாதுகாப்பு மற்றும் நன்மை", "வெற்றி"],
      correctIndex: 1,
    },
    {
      question: "ஃபஜ்ர் தொழுகை எந்த நேரத்தில்?",
      options: ["மாலை", "நள்ளிரவு", "விடியலில்"],
      correctIndex: 2,
    },
    {
      question: "காலை ஆதினைகளில் (அஸ்கார்) படிக்க வேண்டியது எத்தனை முறை?",
      options: ["3", "7", "33"],
      correctIndex: 2,
    },
  ],
};
