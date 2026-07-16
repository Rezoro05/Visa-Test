"use client";

import { useEffect, useMemo, useState } from "react";

type Language = "en" | "ka";
type DestinationCode = "USA" | "CANADA";
type AnswerValue = string | number | string[];

type Question = {
  id: string;
  type: "single_choice" | "multi_choice" | "number";
  text: Record<Language, string>;
  options?: { value: string; label: Record<Language, string> }[];
  min?: number;
  max?: number;
  showIf?: { questionId: string; equals: string };
};

type Rule = {
  questionId: string;
  answerValue: string;
  adjustment: number;
  factorCode: string;
  direction: "positive" | "negative";
  explanation: string;
  action: string;
  manualReview?: boolean;
};

type DestinationConfig = {
  code: DestinationCode;
  label: string;
  scoringMethod: "baseline_adjustment" | "point_mapping";
  baselineScore?: number;
  travelPointsPerGroup: number;
  travelCap: number;
  questions: Question[];
  rules: Rule[];
};

type Contact = {
  name: string;
  email: string;
  phone: string;
  consent: boolean;
};

type ScoreResult = {
  score: number;
  category: "High" | "Moderate" | "Low" | "Very Low";
  explanation: string;
  strengths: Rule[];
  risks: Rule[];
  nextSteps: string[];
  manualReview: boolean;
  publicId: string;
  tarotCards: TarotCard[];
};

type TarotCard = {
  name: string;
  symbol: string;
};

const draftKey = "test_visa_draft_v1";
const whatsappNumber = "995555123456";

function getInitialDraft() {
  const blankDraft = {
    language: "en" as Language,
    destination: "" as DestinationCode | "",
    nationality: "",
    step: 0,
    answers: {} as Record<string, AnswerValue>,
  };
  if (typeof window === "undefined") return blankDraft;
  const raw = window.localStorage.getItem(draftKey);
  if (!raw) return blankDraft;

  try {
    const draft = JSON.parse(raw);
    return {
      language: (draft.language ?? "en") as Language,
      destination: (draft.destination ?? "") as DestinationCode | "",
      nationality: draft.nationality ?? "",
      step: draft.step ?? 0,
      answers: draft.answers ?? {},
    };
  } catch {
    window.localStorage.removeItem(draftKey);
    return blankDraft;
  }
}

const copy = {
  en: {
    start: "Start Test",
    headline: "Check Your Visa Chances",
    subhead:
      "Answer a few plain questions and get a friendly visitor-visa readiness estimate in minutes.",
    destination: "Where do you want to travel?",
    nationality: "What is your nationality?",
    nationalityPlaceholder: "Start typing a country",
    back: "Back",
    next: "Next",
    contactTitle: "Almost done. Where should eConsul reach you?",
    contactLead: "Where do you want us to send your results?",
    contactHint: "Add the best contact details, and we will use them to share your assessment result and help if you ask for expert support.",
    resultTitle: "Your estimated visa chance",
    consent:
      "I agree that eConsul may contact me by phone, email, or messaging apps about my visa assessment and related services.",
    showResult: "Show My Result",
    strengths: "What helps your profile",
    risks: "What may reduce your chances",
    nextSteps: "What to do next",
    expert: "Continue with an eConsul Visa Expert",
    startOver: "Start Over",
    disclaimer:
      "This is an estimated assessment based on the information you provided and Test Visa scoring rules. It is not a government decision, legal advice, or a guarantee of visa approval.",
    manual:
      "Your answers include a complex risk factor. A normal percentage may not tell the full story, so expert review is recommended before applying.",
    fullName: "Full name",
    email: "Email",
    phone: "Phone with country code",
    emptyStrengths: "No strong positive factors captured yet.",
    emptyRisks: "No major risk factors captured in this beta.",
  },
  ka: {
    start: "დაწყება",
    headline: "შეამოწმეთ სავიზო მზაობა",
    subhead:
      "უპასუხეთ რამდენიმე მარტივ კითხვას და რამდენიმე წუთში მიიღეთ ვიზიტორის ვიზისთვის მზადყოფნის შეფასება.",
    destination: "რომელ ქვეყანაში გსურთ გამგზავრება?",
    nationality: "რომელი ქვეყნის მოქალაქე ხართ?",
    nationalityPlaceholder: "ჩაწერეთ ქვეყანა",
    back: "უკან",
    next: "შემდეგი",
    contactTitle: "თითქმის დავასრულეთ.",
    contactLead: "სად გსურთ გამოგიგზავნოთ შედეგი?",
    contactHint: "მიუთითეთ თქვენთვის მოსახერხებელი საკონტაქტო ინფორმაცია. ამ მონაცემებს გამოვიყენებთ შეფასების გასაზიარებლად და ექსპერტის დახმარებისთვის, თუ ამას მოითხოვთ.",
    resultTitle: "თქვენი სავიზო შეფასება",
    consent:
      "ვეთანხმები, რომ eConsul დამიკავშირდეს ტელეფონით, ელფოსტით ან მესენჯერებით ჩემი ვიზის შეფასებისა და დაკავშირებული სერვისების შესახებ.",
    showResult: "შედეგის ნახვა",
    strengths: "რა აძლიერებს თქვენს პროფილს",
    risks: "რა შეიძლება ამცირებდეს შეფასებას",
    nextSteps: "რა მოამზადოთ შემდეგ",
    expert: "eConsul-ის ვიზის ექსპერტთან გაგრძელება",
    startOver: "თავიდან დაწყება",
    disclaimer:
      "ეს არის სავარაუდო შეფასება თქვენს პასუხებსა და Test Visa-ს წესებზე დაყრდნობით. ეს არ არის სახელმწიფო გადაწყვეტილება, იურიდიული რჩევა ან ვიზის მიღების გარანტია.",
    manual:
      "თქვენს პასუხებში ჩანს კომპლექსური რისკ-ფაქტორი. მხოლოდ პროცენტული შეფასება სრულ სურათს ვერ აჩვენებს, ამიტომ განაცხადამდე რეკომენდებულია ექსპერტის კონსულტაცია.",
    fullName: "სახელი და გვარი",
    email: "ელფოსტა",
    phone: "ტელეფონი ქვეყნის კოდით",
    emptyStrengths: "ამ ეტაპზე ძლიერი დადებითი ფაქტორი არ დაფიქსირდა.",
    emptyRisks: "ამ ბეტა შეფასებაში მნიშვნელოვანი რისკი არ დაფიქსირდა.",
  },
} satisfies Record<Language, Record<string, string>>;

const sharedQuestions: Question[] = [
  {
    id: "married",
    type: "single_choice",
    text: { en: "Are you married?", ka: "ხართ დაქორწინებული?" },
    options: yesNo(),
  },
  {
    id: "international_travel",
    type: "single_choice",
    text: {
      en: "Have you traveled internationally before?",
      ka: "გიმოგზაურიათ საზღვარგარეთ?",
    },
    options: yesNo(),
  },
  {
    id: "countries_visited_count",
    type: "number",
    min: 0,
    max: 100,
    showIf: { questionId: "international_travel", equals: "yes" },
    text: {
      en: "How many countries have you visited?",
      ka: "რამდენ ქვეყანაში ხართ ნამყოფი?",
    },
  },
  {
    id: "visited_countries",
    type: "multi_choice",
    showIf: { questionId: "international_travel", equals: "yes" },
    text: {
      en: "Which countries have you visited before?",
      ka: "რომელ ქვეყნებში ხართ ნამყოფი?",
    },
    options: [
      label("usa", "United States", "ამერიკის შეერთებული შტატები"),
      label("canada", "Canada", "კანადა"),
      label("uk", "United Kingdom", "დიდი ბრიტანეთი"),
      label("ireland", "Ireland", "ირლანდია"),
      label("schengen", "Schengen / EU country", "შენგენის / ევროკავშირის ქვეყანა"),
      label("australia", "Australia", "ავსტრალია"),
      label("new_zealand", "New Zealand", "ახალი ზელანდია"),
      label("japan", "Japan", "იაპონია"),
      label("south_korea", "South Korea", "სამხრეთ კორეა"),
      label("uae", "United Arab Emirates", "არაბთა გაერთიანებული საამიროები"),
      label("turkey", "Turkey", "თურქეთი"),
      label("other", "Other country", "სხვა ქვეყანა"),
    ],
  },
  {
    id: "previous_destination_visa_result",
    type: "single_choice",
    text: {
      en: "If you applied for this destination before, what happened last time?",
      ka: "თუ ამ მიმართულებაზე ვიზა გქონდათ მოთხოვნილი, რა შედეგი იყო ბოლოს?",
    },
    options: [
      label("never_applied", "Never applied before", "არასდროს შემიტანია"),
      label("issued", "Issued", "მომცეს ვიზა"),
      label("refused", "Refused", "უარი მივიღე"),
    ],
  },
  {
    id: "destination_visa_revoked",
    type: "single_choice",
    text: {
      en: "Have you ever had this destination's visa canceled or revoked?",
      ka: "ოდესმე გაგიუქმდათ ამ ქვეყნის ვიზა?",
    },
    options: yesNo(),
  },
  {
    id: "arrested",
    type: "single_choice",
    text: { en: "Have you ever been arrested?", ka: "ოდესმე დაგაკავეს?" },
    options: yesNo(),
  },
  {
    id: "occupation_status",
    type: "single_choice",
    text: { en: "What is your occupation status?", ka: "როგორია თქვენი დასაქმების სტატუსი?" },
    options: [
      label("employed", "Employed", "დასაქმებული"),
      label("self_employed", "Self-employed", "თვითდასაქმებული"),
      label("student", "Student", "სტუდენტი"),
      label("retired", "Retired", "პენსიონერი"),
      label("unemployed", "Unemployed / none", "უმუშევარი / არცერთი"),
    ],
  },
  {
    id: "regular_monthly_income",
    type: "single_choice",
    text: { en: "Do you have regular monthly income?", ka: "გაქვთ რეგულარული თვიური შემოსავალი?" },
    options: yesNo(),
  },
  {
    id: "monthly_salary_range",
    type: "single_choice",
    showIf: { questionId: "regular_monthly_income", equals: "yes" },
    text: {
      en: "What is your approximate monthly salary range?",
      ka: "დაახლოებით რა არის თქვენი თვიური ხელფასის დიაპაზონი?",
    },
    options: [
      label("under_500", "Under $500", "$500-ზე ნაკლები"),
      label("500_1000", "$500-$1,000", "$500-$1,000"),
      label("1000_2000", "$1,000-$2,000", "$1,000-$2,000"),
      label("over_2000", "Over $2,000", "$2,000-ზე მეტი"),
    ],
  },
  {
    id: "education_level",
    type: "single_choice",
    text: { en: "What is your highest completed education?", ka: "რა არის თქვენი დასრულებული განათლების უმაღლესი დონე?" },
    options: [
      label("high_school", "High school", "საშუალო სკოლა"),
      label("college", "College / bachelor's", "კოლეჯი / ბაკალავრი"),
      label("advanced", "Advanced degree", "მაგისტრი ან უფრო მაღალი"),
      label("none", "No education selected", "არ მაქვს დასრულებული განათლება"),
    ],
  },
  {
    id: "immediate_relatives_destination",
    type: "single_choice",
    text: {
      en: "Do you have immediate relatives in the destination country?",
      ka: "გყავთ ახლო ნათესავები დანიშნულების ქვეყანაში?",
    },
    options: yesNo(),
  },
];

const configs: Record<DestinationCode, DestinationConfig> = {
  USA: {
    code: "USA",
    label: "United States",
    scoringMethod: "baseline_adjustment",
    baselineScore: 50,
    travelPointsPerGroup: 3,
    travelCap: 9,
    questions: [
      ...sharedQuestions,
      {
        id: "interview_nervousness",
        type: "single_choice",
        text: { en: "Do you tend to get nervous during interviews?", ka: "გასაუბრებაზე ხშირად ნერვიულობთ?" },
        options: yesNo(),
      },
      {
        id: "immigrant_petition_filed",
        type: "single_choice",
        text: {
          en: "Has anyone ever filed an immigrant visa petition for you?",
          ka: "ოდესმე ვინმეს შეუტანია თქვენთვის საიმიგრაციო პეტიცია?",
        },
        options: yesNo(),
      },
    ],
    rules: [
      rule("married", "yes", 7, "married", "positive", "Marriage can support home-country ties.", "Prepare marriage and family-tie evidence."),
      rule("international_travel", "yes", 7, "travel", "positive", "Prior international travel supports a credible travel profile.", "Collect passport stamps and prior travel records."),
      rule("previous_destination_visa_result", "issued", 7, "prior_visa", "positive", "A previous issued visa is a strong positive factor.", "Prepare copies of prior visas."),
      rule("previous_destination_visa_result", "refused", -7, "prior_refusal", "negative", "A previous refusal reduces this assessment.", "Prepare a clear explanation of what changed."),
      rule("destination_visa_revoked", "yes", -10, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("arrested", "yes", -10, "arrest", "negative", "Arrest history can create complex visa questions.", "Prepare full disclosure documents and get expert review.", true),
      rule("occupation_status", "unemployed", -6, "occupation", "negative", "No current occupation weakens stability evidence.", "Strengthen financial and home-country ties."),
      rule("regular_monthly_income", "yes", 5, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and bank statements."),
      rule("regular_monthly_income", "no", -6, "income", "negative", "No regular income can weaken the profile.", "Prepare sponsor or savings evidence."),
      rule("monthly_salary_range", "under_500", -4, "salary", "negative", "A lower salary range may require stronger savings or sponsor evidence.", "Prepare bank statements, savings proof, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 2, "salary", "positive", "A stable salary range adds support to your financial profile.", "Prepare recent payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 5, "salary", "positive", "A stronger salary range supports financial stability.", "Prepare payslips, tax records, and bank statements."),
      rule("monthly_salary_range", "over_2000", 8, "salary", "positive", "A high salary range is a strong financial stability signal.", "Prepare salary confirmation and bank statements."),
      rule("education_level", "none", -6, "education", "negative", "No education selected weakens the profile.", "Prepare other evidence of stability."),
      rule("interview_nervousness", "yes", -8, "interview", "negative", "Interview nervousness may affect how clearly you explain your trip.", "Practice your travel purpose and ties explanation."),
      rule("interview_nervousness", "no", 5, "interview", "positive", "Interview confidence supports a clearer application story.", "Prepare concise answers and evidence."),
      rule("immediate_relatives_destination", "no", 6, "relatives", "positive", "No immediate relatives in the destination can reduce overstay concerns.", "Document your reason for returning home."),
      rule("immigrant_petition_filed", "yes", -6, "petition", "negative", "An immigrant petition can raise non-immigrant intent questions.", "Get expert review of your application strategy."),
    ],
  },
  CANADA: {
    code: "CANADA",
    label: "Canada",
    scoringMethod: "point_mapping",
    travelPointsPerGroup: 1,
    travelCap: 3,
    questions: [
      ...sharedQuestions.slice(0, 3),
      {
        id: "visited_related_country",
        type: "single_choice",
        text: { en: "Have you ever been to the United States?", ka: "ყოფილხართ ამერიკის შეერთებულ შტატებში?" },
        options: yesNo(),
      },
      ...sharedQuestions.slice(3),
      {
        id: "bank_statement_available",
        type: "single_choice",
        text: {
          en: "Do you have bank statements for the past 3-6 months?",
          ka: "გაქვთ ბოლო 3-6 თვის საბანკო ამონაწერი?",
        },
        options: yesNo(),
      },
      {
        id: "immigration_process_started",
        type: "single_choice",
        text: {
          en: "Have you started any immigration process?",
          ka: "დაწყებული გაქვთ რაიმე საიმიგრაციო პროცესი?",
        },
        options: yesNo(),
      },
    ],
    rules: [
      rule("married", "yes", 1, "married", "positive", "Marriage can support home-country ties.", "Prepare marriage and family-tie evidence."),
      rule("international_travel", "yes", 1, "travel", "positive", "Prior international travel supports a credible profile.", "Gather travel records."),
      rule("international_travel", "no", -1, "travel", "negative", "No prior international travel is a modest risk.", "Strengthen other evidence."),
      rule("visited_related_country", "yes", 2, "visited_us", "positive", "Prior U.S. travel is positive for Canada assessments.", "Include U.S. travel history."),
      rule("visited_related_country", "no", -1, "visited_us", "negative", "No U.S. travel removes a useful support factor.", "Strengthen financial evidence."),
      rule("previous_destination_visa_result", "issued", 1, "prior_visa", "positive", "A previous issued visa helps your profile.", "Prepare prior visa copies."),
      rule("previous_destination_visa_result", "refused", -1, "prior_refusal", "negative", "A previous refusal is a risk factor.", "Explain what changed since refusal."),
      rule("destination_visa_revoked", "yes", -1, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("arrested", "yes", -1, "arrest", "negative", "Arrest history can create complex visa questions.", "Prepare full disclosure documents.", true),
      rule("occupation_status", "unemployed", -1, "occupation", "negative", "No current occupation weakens stability evidence.", "Strengthen home-country ties."),
      rule("regular_monthly_income", "yes", 1, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and statements."),
      rule("regular_monthly_income", "no", -1, "income", "negative", "No regular income can weaken the profile.", "Prepare sponsor or savings evidence."),
      rule("monthly_salary_range", "under_500", -1, "salary", "negative", "A lower salary range may require stronger financial evidence.", "Prepare bank statements, savings proof, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 0, "salary", "positive", "A stable salary range gives some support to your profile.", "Prepare recent payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 1, "salary", "positive", "A stronger salary range supports financial stability.", "Prepare payslips and bank statements."),
      rule("monthly_salary_range", "over_2000", 2, "salary", "positive", "A high salary range is a strong financial stability signal.", "Prepare salary confirmation and bank statements."),
      rule("education_level", "none", -1, "education", "negative", "No education selected weakens the profile.", "Prepare other stability evidence."),
      rule("bank_statement_available", "yes", 2, "bank", "positive", "Bank statements are important financial evidence.", "Prepare recent bank statements."),
      rule("bank_statement_available", "no", -2, "bank", "negative", "Missing bank statements can significantly weaken the file.", "Collect statements before applying."),
      rule("immediate_relatives_destination", "no", 1, "relatives", "positive", "No immediate relatives in Canada can reduce overstay concerns.", "Document your return plans."),
      rule("immigration_process_started", "yes", -1, "immigration", "negative", "An immigration process can complicate visitor intent.", "Get expert review before applying."),
    ],
  },
};

const nationalities = [
  "Georgia",
  "Armenia",
  "Azerbaijan",
  "Turkey",
  "Ukraine",
  "India",
  "Philippines",
  "United Arab Emirates",
  "Russia",
  "Other",
];

function yesNo() {
  return [label("yes", "Yes", "კი"), label("no", "No", "არა")];
}

function label(value: string, en: string, ka: string) {
  return { value, label: { en, ka } };
}

function rule(
  questionId: string,
  answerValue: string,
  adjustment: number,
  factorCode: string,
  direction: "positive" | "negative",
  explanation: string,
  action: string,
  manualReview = false,
): Rule {
  return { questionId, answerValue, adjustment, factorCode, direction, explanation, action, manualReview };
}

function visibleQuestions(config: DestinationConfig, answers: Record<string, AnswerValue>) {
  return config.questions.filter((question) => {
    if (!question.showIf) return true;
    return answers[question.showIf.questionId] === question.showIf.equals;
  });
}

function category(score: number): ScoreResult["category"] {
  if (score >= 80) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 20) return "Low";
  return "Very Low";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapPointsToScore(points: number) {
  const capped = clamp(points, -10, 12);
  if (capped >= 8) return Math.round(80 + ((capped - 8) / 4) * 15);
  if (capped >= 4) return Math.round(50 + ((capped - 4) / 3) * 29);
  if (capped >= 0) return Math.round(20 + (capped / 3) * 29);
  return Math.round(5 + ((capped + 10) / 9) * 14);
}

function makePublicId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "TV-";
  for (let i = 0; i < 6; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const tarotDeck = [
  {
    name: "The Sun",
    symbol: "☀",
  },
  {
    name: "The Star",
    symbol: "✦",
  },
  {
    name: "The Wheel",
    symbol: "◉",
  },
  {
    name: "The Moon",
    symbol: "☾",
  },
  {
    name: "The Passport",
    symbol: "▣",
  },
  {
    name: "The Anchor",
    symbol: "⌂",
  },
];

function makeTarotCards(): TarotCard[] {
  return [...tarotDeck].sort(() => Math.random() - 0.5).slice(0, 3);
}

function scoreAssessment(config: DestinationConfig, answers: Record<string, AnswerValue>): ScoreResult {
  const matched = config.rules.filter((ruleItem) => String(answers[ruleItem.questionId]) === ruleItem.answerValue);
  const education = answers.education_level;
  if (education && education !== "none") {
    matched.push(rule("education_level", String(education), config.code === "USA" ? 6 : 1, "education", "positive", "Recognized education supports your profile.", "Prepare diplomas or certificates."));
  }
  const occupation = answers.occupation_status;
  if (occupation && occupation !== "unemployed") {
    matched.push(rule("occupation_status", String(occupation), config.code === "USA" ? 6 : 1, "occupation", "positive", "Occupation or study supports stability evidence.", "Prepare employment, business, study, or retirement documents."));
  }
  if (answers.international_travel === "yes") {
    const count = Number(answers.countries_visited_count || 0);
    const travelBonus = Math.min(Math.floor(count / 5) * config.travelPointsPerGroup, config.travelCap);
    if (travelBonus > 0) {
      matched.push(rule("countries_visited_count", String(count), travelBonus, "travel_depth", "positive", "Multiple trips can support a stronger travel history.", "Prepare passport stamps and previous visas."));
    }
    const visitedCountries = Array.isArray(answers.visited_countries) ? answers.visited_countries : [];
    const strongVisaCountries = new Set(["usa", "canada", "uk", "ireland", "schengen", "australia", "new_zealand", "japan", "south_korea"]);
    const excludedCountries = new Set(config.code === "USA" ? ["usa"] : ["canada", "usa"]);
    const strongCountryCount = visitedCountries.filter(
      (country) => strongVisaCountries.has(country) && !excludedCountries.has(country),
    ).length;
    const rawScreenedTravelBonus = config.code === "USA" ? strongCountryCount * 2 : strongCountryCount;
    const remainingTravelCap = Math.max(0, config.travelCap - travelBonus);
    const screenedTravelBonus = Math.min(rawScreenedTravelBonus, remainingTravelCap);
    if (screenedTravelBonus > 0) {
      matched.push(rule("visited_countries", String(strongCountryCount), screenedTravelBonus, "screened_travel", "positive", "Travel to countries with stronger visa or entry screening can support your credibility.", "Prepare copies of previous visas, entry stamps, and travel dates."));
    }
  }

  const adjustment = matched.reduce((sum, factor) => sum + factor.adjustment, 0);
  const score =
    config.scoringMethod === "baseline_adjustment"
      ? clamp((config.baselineScore ?? 50) + adjustment, 5, 95)
      : clamp(mapPointsToScore(adjustment), 5, 95);

  const resultCategory = category(score);
  return {
    score,
    category: resultCategory,
    explanation:
      resultCategory === "High"
        ? "Your answers indicate a comparatively strong visitor-visa profile under the beta rules."
        : resultCategory === "Moderate"
          ? "Your profile includes useful strengths, but a few areas need careful evidence."
          : resultCategory === "Low"
            ? "Your profile currently has meaningful weaknesses that should be reviewed before applying."
            : "Your answers show critical weaknesses or complex circumstances.",
    strengths: matched.filter((factor) => factor.direction === "positive"),
    risks: matched.filter((factor) => factor.direction === "negative"),
    nextSteps: Array.from(new Set(matched.map((factor) => factor.action))).slice(0, 5),
    manualReview: matched.some((factor) => factor.manualReview),
    publicId: makePublicId(),
    tarotCards: makeTarotCards(),
  };
}

function categoryLabel(value: ScoreResult["category"], language: Language) {
  if (language === "en") return value;
  return {
    High: "მაღალი",
    Moderate: "საშუალო",
    Low: "დაბალი",
    "Very Low": "ძალიან დაბალი",
  }[value];
}

function resultExplanation(value: ScoreResult["category"], language: Language) {
  if (language === "en") {
    return value === "High"
      ? "Your answers indicate a comparatively strong visitor-visa profile under the beta rules."
      : value === "Moderate"
        ? "Your profile includes useful strengths, but a few areas need careful evidence."
        : value === "Low"
          ? "Your profile currently has meaningful weaknesses that should be reviewed before applying."
          : "Your answers show critical weaknesses or complex circumstances.";
  }

  return value === "High"
    ? "თქვენი პასუხები მიუთითებს შედარებით ძლიერ ვიზიტორის ვიზის პროფილზე."
    : value === "Moderate"
      ? "თქვენს პროფილს აქვს დადებითი მხარეები, თუმცა რამდენიმე საკითხს ძლიერი მტკიცებულება სჭირდება."
      : value === "Low"
        ? "თქვენს პროფილში ჩანს სუსტი მხარეები, რომელთა გადახედვაც განაცხადამდე სასურველია."
        : "თქვენი პასუხები მიუთითებს მნიშვნელოვან სირთულეებზე ან კომპლექსურ გარემოებებზე.";
}

function factorExplanation(item: Rule, language: Language) {
  if (language === "en") return item.explanation;
  const map: Record<string, string> = {
    married: "ოჯახური მდგომარეობა შეიძლება აჩვენებდეს კავშირს საცხოვრებელ ქვეყანასთან.",
    travel: "საერთაშორისო მოგზაურობის ისტორია აძლიერებს მოგზაურის პროფილს.",
    travel_depth: "რამდენიმე ქვეყანაში მოგზაურობა დადებითად აჩვენებს თქვენს სამოგზაურო გამოცდილებას.",
    screened_travel: "ძლიერი სავიზო ან სასაზღვრო კონტროლის მქონე ქვეყნებში მოგზაურობა დამატებით აძლიერებს თქვენს სანდოობას.",
    prior_visa: "ადრე მიღებული ვიზა დადებითი ფაქტორია.",
    prior_refusal: "წინა უარი ამცირებს შეფასებას და საჭიროებს ახსნას.",
    revoked: "გაუქმებული ვიზა მნიშვნელოვანი რისკ-ფაქტორია.",
    arrest: "დაკავების ისტორია შეიძლება რთულ სავიზო კითხვებს ქმნიდეს.",
    occupation: item.direction === "positive" ? "დასაქმება ან სწავლა აძლიერებს სტაბილურობის მტკიცებულებას." : "ამჟამინდელი საქმიანობის არქონა ასუსტებს სტაბილურობის მტკიცებულებას.",
    income: item.direction === "positive" ? "რეგულარული შემოსავალი აძლიერებს ფინანსურ სტაბილურობას." : "რეგულარული შემოსავლის არქონა ფინანსურ ნაწილს ასუსტებს.",
    salary: item.direction === "positive" ? "ხელფასის მითითებული დიაპაზონი მხარს უჭერს ფინანსურ სტაბილურობას." : "ხელფასის დაბალი დიაპაზონი უფრო ძლიერ ფინანსურ მტკიცებულებას მოითხოვს.",
    education: item.direction === "positive" ? "დასრულებული განათლება დადებითად მოქმედებს პროფილის სტაბილურობაზე." : "განათლების არმითითება ან არქონა ასუსტებს პროფილს.",
    interview: item.direction === "positive" ? "გასაუბრებაზე თავდაჯერებულობა განაცხადის უკეთ ახსნაში გეხმარებათ." : "გასაუბრებაზე ნერვიულობამ შეიძლება პასუხების სიცხადეზე იმოქმედოს.",
    relatives: "დანიშნულების ქვეყანაში ახლო ნათესავების არყოლამ შეიძლება შეამციროს დარჩენის რისკის აღქმა.",
    petition: "საიმიგრაციო პეტიციამ შეიძლება გაართულოს ვიზიტორის ვიზის განზრახვის შეფასება.",
    visited_us: item.direction === "positive" ? "აშშ-ში მოგზაურობა კანადის ვიზის შეფასებისთვის დადებითი ფაქტორია." : "აშშ-ში მოგზაურობის არქონა ამ კონკრეტულ დადებით ფაქტორს არ გაძლევთ.",
    bank: item.direction === "positive" ? "საბანკო ამონაწერები მნიშვნელოვანი ფინანსური მტკიცებულებაა." : "საბანკო ამონაწერების არქონა განაცხადს ასუსტებს.",
    immigration: "დაწყებულმა საიმიგრაციო პროცესმა შეიძლება ვიზიტორის განზრახვა გაართულოს.",
  };
  return map[item.factorCode] ?? item.explanation;
}

function factorAction(item: Rule, language: Language) {
  if (language === "en") return item.action;
  const map: Record<string, string> = {
    married: "მოამზადეთ ქორწინების მოწმობა და ოჯახური კავშირების მტკიცებულება.",
    travel: "მოამზადეთ პასპორტის შტამპები, წინა ვიზები და მოგზაურობის ისტორია.",
    travel_depth: "მოამზადეთ პასპორტის შტამპები და წინა ვიზების ასლები.",
    screened_travel: "მოამზადეთ წინა ვიზების ასლები, შესვლის შტამპები და მოგზაურობის თარიღები.",
    prior_visa: "მოამზადეთ ადრე მიღებული ვიზების ასლები.",
    prior_refusal: "მოამზადეთ მოკლე ახსნა, რა შეიცვალა წინა უარის შემდეგ.",
    revoked: "განაცხადამდე მიიღეთ ექსპერტის კონსულტაცია და მოამზადეთ სრული ინფორმაცია.",
    arrest: "მოამზადეთ სრული დოკუმენტები და მიმართეთ ექსპერტს განაცხადამდე.",
    occupation: "მოამზადეთ დასაქმების, ბიზნესის, სწავლის ან პენსიის დამადასტურებელი დოკუმენტები.",
    income: "მოამზადეთ ხელფასის ცნობები და საბანკო ამონაწერები.",
    salary: "მოამზადეთ ხელფასის ცნობა, საბანკო ამონაწერები და საჭიროების შემთხვევაში სპონსორის დოკუმენტები.",
    education: "მოამზადეთ დიპლომები, სერტიფიკატები ან სხვა სტაბილურობის მტკიცებულება.",
    interview: "წინასწარ მოამზადეთ მოგზაურობის მიზნისა და დაბრუნების მიზეზების მოკლე ახსნა.",
    relatives: "მოამზადეთ დაბრუნების გეგმისა და ადგილობრივი კავშირების მტკიცებულება.",
    petition: "განაცხადის სტრატეგია ექსპერტთან გადაამოწმეთ.",
    visited_us: "მიუთითეთ აშშ-ში მოგზაურობის ისტორია და მოამზადეთ დამადასტურებელი მასალა.",
    bank: "მოამზადეთ ბოლო თვეების საბანკო ამონაწერები.",
    immigration: "განაცხადამდე გადაამოწმეთ სტრატეგია ექსპერტთან.",
  };
  return map[item.factorCode] ?? item.action;
}

export default function Home() {
  const [draftRestored, setDraftRestored] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [destination, setDestination] = useState<DestinationCode | "">("");
  const [nationality, setNationality] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "", consent: false });
  const [result, setResult] = useState<ScoreResult | null>(null);

  const t = copy[language];
  const config = destination ? configs[destination] : null;
  const questions = useMemo(() => (config ? visibleQuestions(config, answers) : []), [answers, config]);
  const activeQuestion = questions[step];
  const isContactStep = config && nationality && step >= questions.length && !result;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = getInitialDraft();
      setLanguage(draft.language);
      setDestination(draft.destination);
      setNationality(draft.nationality);
      setStep(draft.step);
      setAnswers(draft.answers);
      setDraftRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    window.localStorage.setItem(draftKey, JSON.stringify({ language, destination, nationality, step, answers }));
  }, [answers, destination, draftRestored, language, nationality, step]);

  function chooseAnswer(questionId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    setAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      const nextSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [questionId]: nextSelected };
    });
  }

  function hasAnswer(question: Question) {
    const value = answers[question.id];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
  }

  function next() {
    if (step < questions.length) setStep((current) => current + 1);
  }

  function back() {
    if (result) {
      setResult(null);
      return;
    }
    if (step > 0) setStep((current) => current - 1);
  }

  function submitContact() {
    if (!config || !contact.name || !contact.email || !contact.phone || !contact.consent) return;
    const calculated = scoreAssessment(config, answers);
    setResult(calculated);
    window.localStorage.removeItem(draftKey);
  }

  function startOver() {
    setDestination("");
    setNationality("");
    setStep(0);
    setAnswers({});
    setContact({ name: "", email: "", phone: "", consent: false });
    setResult(null);
    window.localStorage.removeItem(draftKey);
  }

  const waText =
    result && config
      ? encodeURIComponent(
          `I completed the Test Visa assessment and want expert help.\n\nName: ${contact.name}\nDestination: ${config.label}\nEstimated score: ${result.score}%\nAssessment ID: ${result.publicId}`,
        )
      : "";

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#172119]">
      <section className="mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="brand-logo-wrap">
            {/* Plain img is intentional here: it reliably serves the approved logo asset in local preview and deployed static hosting. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="eConsul" className="brand-logo" height={54} src="/econsul-logo.png" width={231} />
            <span>Test Visa beta</span>
          </div>
          <div className="rounded-full border border-[#d5ded9] bg-white p-1">
            {(["en", "ka"] as Language[]).map((lang) => (
              <button
                className={`rounded-full px-3 py-1.5 text-sm font-bold ${language === lang ? "bg-[#5d9e43] text-white" : "text-[#53635f]"}`}
                key={lang}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className={destination ? "quiz-flow" : "landing-flow"}>
          {!destination && (
          <aside className="hero-visual">
            <div className="hero-animation" aria-label="eConsul robot reading visa cards">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src="/econsul-tarot-animation.gif" />
            </div>
            <div className="hero-copy">
              <div className="inline-flex rounded-full bg-[#75b241] px-4 py-2 text-sm font-black text-white">
                Smart visa check
              </div>
              <div className="space-y-5">
                <h1 className="hero-heading">Check Your Visa <span>Chances</span></h1>
                <p className="max-w-lg text-lg leading-8 text-[#6b6a62]">{t.subhead}</p>
              </div>
            </div>
          </aside>
          )}

          <section className={destination ? "app-panel quiz-panel" : "app-panel destination-section"}>
            {!destination && (
              <div className="flow-space">
                <p className="section-kicker">Pick your destination to begin</p>
                <h2>{t.destination}</h2>
                <div className="destination-row">
                  {(Object.keys(configs) as DestinationCode[]).map((code) => (
                    <button className="destination-card" key={code} onClick={() => setDestination(code)}>
                      <span className="flag" aria-hidden="true">{code === "USA" ? "🇺🇸" : "🇨🇦"}</span>
                      <span>
                        <strong>{configs[code].label}</strong>
                        <small>{code === "USA" ? "B1/B2 visitor profile" : "Visitor visa profile"}</small>
                      </span>
                      <span className="card-cta">
                        {t.start}
                        <span aria-hidden="true">→</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {destination && !nationality && (
              <div className="flow-space">
                <Progress current={1} total={4} />
                <h2>{t.nationality}</h2>
                <input
                  className="text-input"
                  list="nationalities"
                  onChange={(event) => setNationality(event.target.value)}
                  placeholder={t.nationalityPlaceholder}
                  value={nationality}
                />
                <datalist id="nationalities">
                  {nationalities.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <div className="actions">
                  <button className="ghost-button" onClick={() => setDestination("")}>{t.back}</button>
                  <button className="primary-button" disabled={!nationality} onClick={() => setStep(0)}>{t.next}</button>
                </div>
              </div>
            )}

            {activeQuestion && !result && nationality && (
              <div className="flow-space">
                <Progress current={Math.min(step + 2, questions.length + 1)} total={questions.length + 2} />
                <p className="eyebrow">{config?.label} assessment</p>
                <h2>{activeQuestion.text[language] || activeQuestion.text.en}</h2>
                {activeQuestion.type === "single_choice" && (
                  <div className="choice-grid">
                    {activeQuestion.options?.map((option) => (
                      <button
                        className={`choice-card ${answers[activeQuestion.id] === option.value ? "selected" : ""}`}
                        key={option.value}
                        onClick={() => {
                          chooseAnswer(activeQuestion.id, option.value);
                          window.setTimeout(next, 120);
                        }}
                      >
                        <strong>{option.label[language] || option.label.en}</strong>
                      </button>
                    ))}
                  </div>
                )}
                {activeQuestion.type === "multi_choice" && (
                  <div className="choice-grid multi-choice-grid">
                    {activeQuestion.options?.map((option) => {
                      const selected = Array.isArray(answers[activeQuestion.id])
                        ? answers[activeQuestion.id].includes(option.value)
                        : false;
                      return (
                        <button
                          className={`choice-card ${selected ? "selected" : ""}`}
                          key={option.value}
                          onClick={() => toggleMultiAnswer(activeQuestion.id, option.value)}
                        >
                          <strong>{option.label[language] || option.label.en}</strong>
                        </button>
                      );
                    })}
                  </div>
                )}
                {activeQuestion.type === "number" && (
                  <input
                    className="text-input"
                    max={activeQuestion.max}
                    min={activeQuestion.min}
                    onChange={(event) => chooseAnswer(activeQuestion.id, Number(event.target.value))}
                    type="number"
                    value={answers[activeQuestion.id] ?? ""}
                  />
                )}
                <div className="actions">
                  <button className="ghost-button" onClick={back}>{t.back}</button>
                  <button className="primary-button" disabled={!hasAnswer(activeQuestion)} onClick={next}>{t.next}</button>
                </div>
              </div>
            )}

            {isContactStep && (
              <div className="flow-space">
                <Progress current={questions.length + 2} total={questions.length + 2} />
                <h2>{t.contactTitle}</h2>
                <div className="lead-message">
                  <strong>{t.contactLead}</strong>
                  <span>{t.contactHint}</span>
                </div>
                <input className="text-input" onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder={t.fullName} value={contact.name} />
                <input className="text-input" onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder={t.email} type="email" value={contact.email} />
                <input className="text-input" onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder={t.phone} value={contact.phone} />
                <label className="check-row">
                  <input checked={contact.consent} onChange={(event) => setContact({ ...contact, consent: event.target.checked })} type="checkbox" />
                  <span>{t.consent}</span>
                </label>
                <div className="actions">
                  <button className="ghost-button" onClick={back}>{t.back}</button>
                  <button className="primary-button" disabled={!contact.name || !contact.email || !contact.phone || !contact.consent} onClick={submitContact}>{t.showResult}</button>
                </div>
              </div>
            )}

            {result && config && (
              <div className="flow-space result-view">
                <p className="eyebrow">{result.publicId}</p>
                <div className="tarot-result">
                  <div className="tarot-grid" aria-label="Visa tarot cards">
                    {result.tarotCards.map((card) => (
                      <article className="tarot-card" key={card.name} aria-label={card.name}>
                        <span aria-hidden="true">{card.symbol}</span>
                      </article>
                    ))}
                  </div>
                </div>
                <h2>{t.resultTitle}</h2>
                <div className="score-row">
                  <span>{result.score}%</span>
                  <strong>{categoryLabel(result.category, language)}</strong>
                </div>
                <p className="result-copy">{resultExplanation(result.category, language)}</p>
                {result.manualReview && <div className="warning">{t.manual}</div>}
                <FactorList title={t.strengths} items={result.strengths} empty={t.emptyStrengths} language={language} />
                <FactorList title={t.risks} items={result.risks} empty={t.emptyRisks} language={language} />
                <div>
                  <h3>{t.nextSteps}</h3>
                  <ul>
                    {(result.strengths.length || result.risks.length
                      ? Array.from(new Set([...result.risks, ...result.strengths].map((item) => factorAction(item, language)))).slice(0, 5)
                      : [language === "en" ? "Prepare evidence for your purpose of travel, finances, and return plans." : "მოამზადეთ მოგზაურობის მიზნის, ფინანსებისა და დაბრუნების გეგმის მტკიცებულება."]
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className="disclaimer">{t.disclaimer}</p>
                <div className="actions result-actions">
                  <a className="primary-button" href={`https://wa.me/${whatsappNumber}?text=${waText}`} rel="noreferrer" target="_blank">{t.expert}</a>
                  <button className="ghost-button" onClick={startOver}>{t.startOver}</button>
                </div>
              </div>
            )}
          </section>
        </div>
        {!destination && (
          <>
            <section className="steps-strip">
              <div>
                <span aria-hidden="true">?</span>
                <strong>Answer simple questions</strong>
                <p>Plain questions, no jargon.</p>
              </div>
              <div>
                <span aria-hidden="true">%</span>
                <strong>Get your readiness score</strong>
                <p>A clear estimate in minutes.</p>
              </div>
              <div>
                <span aria-hidden="true">✓</span>
                <strong>See what to improve</strong>
                <p>Strengths, risks, and next steps.</p>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="progress" aria-label={`Step ${current} of ${total}`}>
      <span style={{ width: `${Math.min(100, (current / total) * 100)}%` }} />
    </div>
  );
}

function FactorList({ title, items, empty, language }: { title: string; items: Rule[]; empty: string; language: Language }) {
  return (
    <div>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.slice(0, 4).map((item) => (
            <li key={`${item.factorCode}-${item.adjustment}`}>{factorExplanation(item, language)}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}
