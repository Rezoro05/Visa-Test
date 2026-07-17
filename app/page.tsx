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
  image: string;
};

const draftKey = "test_visa_draft_v1";
const whatsappNumber = "995555123456";

function getInitialDraft() {
  const blankDraft = {
    language: "en" as Language,
    destination: "" as DestinationCode | "",
    nationality: "",
    nationalityConfirmed: false,
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
      nationalityConfirmed: draft.nationalityConfirmed ?? Boolean(draft.nationality),
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
    nationalityPlaceholder: "Select your nationality",
    back: "Back",
    next: "Next",
    contactTitle: "Almost done. Where should eConsul reach you?",
    contactLead: "Where do you want us to send your results?",
    contactHint: "Add the best contact details, and we will use them to share your assessment result and help if you ask for expert support.",
    resultTitle: "Your visa readiness estimate",
    consent:
      "I agree that eConsul may contact me by phone, email, or messaging apps about my visa assessment and related services.",
    showResult: "Show My Result",
    strengths: "What helps your profile",
    risks: "What may weaken your profile",
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
    destinationKicker: "Pick your destination to begin",
    assessment: "assessment",
    usProfile: "B1/B2 visitor profile",
    canadaProfile: "Visitor visa profile",
    usName: "United States",
    canadaName: "Canada",
    stepOneTitle: "Answer simple questions",
    stepOneText: "Plain questions, no jargon.",
    stepTwoTitle: "Get your readiness score",
    stepTwoText: "A clear estimate in minutes.",
    stepThreeTitle: "See what to improve",
    stepThreeText: "Strengths, risks, and next steps.",
  },
  ka: {
    start: "დაწყება",
    headline: "შეამოწმეთ სავიზო მზაობა",
    subhead:
      "უპასუხეთ რამდენიმე მარტივ კითხვას და სულ რამდენიმე წუთში მიიღეთ ვიზიტორის ვიზისთვის თქვენი მზაობის წინასწარი შეფასება.",
    destination: "სად გსურთ გამგზავრება?",
    nationality: "რომელი ქვეყნის მოქალაქე ხართ?",
    nationalityPlaceholder: "აირჩიეთ მოქალაქეობა",
    back: "უკან",
    next: "შემდეგი",
    contactTitle: "თითქმის დასრულებულია",
    contactLead: "სად გსურთ გამოგიგზავნოთ შედეგი?",
    contactHint: "მიუთითეთ თქვენთვის მოსახერხებელი საკონტაქტო ინფორმაცია. მას შედეგის გამოსაგზავნად და, თქვენი სურვილის შემთხვევაში, ექსპერტთან დასაკავშირებლად გამოვიყენებთ.",
    resultTitle: "თქვენი სავიზო მზაობის შეფასება",
    consent:
      "ვეთანხმები, რომ eConsul დამიკავშირდეს ტელეფონით, ელფოსტით ან შეტყობინებების აპებით ჩემი სავიზო შეფასებისა და შესაბამისი მომსახურებების შესახებ.",
    showResult: "შედეგის ნახვა",
    strengths: "რა აძლიერებს თქვენს პროფილს",
    risks: "რა შეიძლება ასუსტებდეს თქვენს პროფილს",
    nextSteps: "რა მოამზადოთ შემდეგ",
    expert: "eConsul-ის ვიზის ექსპერტთან გაგრძელება",
    startOver: "თავიდან დაწყება",
    disclaimer:
      "ეს არის წინასწარი შეფასება, რომელიც თქვენს პასუხებსა და Test Visa-ს შეფასების წესებს ეფუძნება. იგი არ წარმოადგენს სახელმწიფო ორგანოს გადაწყვეტილებას, იურიდიულ კონსულტაციას ან ვიზის გაცემის გარანტიას.",
    manual:
      "თქვენს პასუხებში ჩანს კომპლექსური რისკ-ფაქტორი. მხოლოდ პროცენტული შეფასება სრულ სურათს ვერ აჩვენებს, ამიტომ განაცხადამდე რეკომენდებულია ექსპერტის კონსულტაცია.",
    fullName: "სახელი და გვარი",
    email: "ელფოსტა",
    phone: "ტელეფონი ქვეყნის კოდით",
    emptyStrengths: "ამ ეტაპზე ძლიერი დადებითი ფაქტორი არ დაფიქსირდა.",
    emptyRisks: "ამ წინასწარი შეფასებით მნიშვნელოვანი რისკ-ფაქტორი არ გამოვლენილა.",
    destinationKicker: "დასაწყებად აირჩიეთ ქვეყანა",
    assessment: "შეფასება",
    usProfile: "B1/B2 ვიზიტორის ვიზა",
    canadaProfile: "ვიზიტორის ვიზა",
    usName: "ამერიკის შეერთებული შტატები",
    canadaName: "კანადა",
    stepOneTitle: "უპასუხეთ მარტივ კითხვებს",
    stepOneText: "მარტივი და გასაგები კითხვები.",
    stepTwoTitle: "მიიღეთ მზაობის შეფასება",
    stepTwoText: "წინასწარი შეფასება რამდენიმე წუთში.",
    stepThreeTitle: "ნახეთ, რა არის გასაუმჯობესებელი",
    stepThreeText: "ძლიერი მხარეები, რისკები და შემდეგი ნაბიჯები.",
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
      ka: "თუ ამ ქვეყნის ვიზაზე ადრე შეგიტანიათ განაცხადი, რა შედეგი მიიღეთ ბოლოს?",
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
      ka: "ოდესმე გაუუქმებიათ თქვენთვის ამ ქვეყნის ვიზა?",
    },
    options: yesNo(),
  },
  {
    id: "immigration_violation",
    type: "single_choice",
    text: {
      en: "Have you ever overstayed a visa, been deported, or been removed from any country?",
      ka: "ოდესმე დაგირღვევიათ ვიზის ვადა, ან დაგიდეპორტებიათ რომელიმე ქვეყნიდან?",
    },
    options: yesNo(),
  },
  {
    id: "arrested",
    type: "single_choice",
    text: {
      en: "Have you ever been arrested, charged, or convicted of an offense?",
      ka: "ოდესმე დაუკავებიხართ, წაგიყენებიათ ბრალი ან ყოფილხართ მსჯავრდებული?",
    },
    options: yesNo(),
  },
  {
    id: "occupation_status",
    type: "single_choice",
    text: { en: "What is your occupation status?", ka: "რომელია თქვენი ამჟამინდელი საქმიანობის სტატუსი?" },
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
    id: "trip_funds_documented",
    type: "single_choice",
    text: {
      en: "Can you document enough funds to cover your planned trip?",
      ka: "შეგიძლიათ დაგეგმილი მოგზაურობის ხარჯების დასაფარად საკმარისი თანხის დადასტურება?",
    },
    options: yesNo(),
  },
  {
    id: "monthly_salary_range",
    type: "single_choice",
    showIf: { questionId: "regular_monthly_income", equals: "yes" },
    text: {
      en: "What is your approximate monthly income range?",
      ka: "რომელ დიაპაზონშია თქვენი საშუალო თვიური შემოსავალი?",
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
    text: { en: "What is your highest completed education?", ka: "რა არის თქვენ მიერ დასრულებული განათლების უმაღლესი საფეხური?" },
    options: [
      label("high_school", "High school", "საშუალო სკოლა"),
      label("college", "College / bachelor's", "კოლეჯი / ბაკალავრი"),
      label("advanced", "Advanced degree", "მაგისტრი ან უფრო მაღალი"),
      label("none", "No completed formal education", "ფორმალური განათლება არ დამისრულებია"),
    ],
  },
  {
    id: "home_country_commitments",
    type: "single_choice",
    text: {
      en: "Do you have ongoing commitments that support your return home, such as work, study, dependents, or property?",
      ka: "გაქვთ მუდმივი ვალდებულებები, რომლებიც სამშობლოში დაბრუნებას ადასტურებს, მაგალითად სამსახური, სწავლა, ოჯახის წევრებზე ზრუნვა ან ქონება?",
    },
    options: yesNo(),
  },
  {
    id: "immediate_relatives_destination",
    type: "single_choice",
    text: {
      en: "Do you have immediate relatives in the destination country?",
      ka: "გყავთ ოჯახის ახლო წევრი დანიშნულების ქვეყანაში?",
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
      rule("married", "yes", 3, "married", "positive", "Marriage can support home-country ties.", "Prepare marriage and family-tie evidence."),
      rule("international_travel", "yes", 7, "travel", "positive", "Prior international travel supports a credible travel profile.", "Collect passport stamps and prior travel records."),
      rule("international_travel", "no", -4, "travel", "negative", "No prior international travel is a modest weakness.", "Strengthen your financial evidence and reasons to return home."),
      rule("previous_destination_visa_result", "issued", 7, "prior_visa", "positive", "A previous issued visa is a strong positive factor.", "Prepare copies of prior visas."),
      rule("previous_destination_visa_result", "refused", -7, "prior_refusal", "negative", "A previous refusal reduces this assessment.", "Prepare a clear explanation of what changed."),
      rule("destination_visa_revoked", "yes", -10, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("immigration_violation", "yes", -20, "immigration_violation", "negative", "A previous overstay, deportation, or removal is a critical risk factor.", "Get expert review and prepare the complete immigration history before applying.", true),
      rule("arrested", "yes", -10, "arrest", "negative", "Arrest history can create complex visa questions.", "Prepare full disclosure documents and get expert review.", true),
      rule("occupation_status", "unemployed", -6, "occupation", "negative", "No current occupation weakens stability evidence.", "Strengthen financial and home-country ties."),
      rule("regular_monthly_income", "yes", 4, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and bank statements."),
      rule("regular_monthly_income", "no", -6, "income", "negative", "No regular income can weaken the profile.", "Prepare sponsor or savings evidence."),
      rule("trip_funds_documented", "yes", 5, "funds", "positive", "Documented trip funds support a credible travel plan.", "Prepare bank statements and a realistic trip budget."),
      rule("trip_funds_documented", "no", -10, "funds", "negative", "Insufficient documented trip funds are a significant weakness.", "Build a clear funding plan before applying."),
      rule("monthly_salary_range", "under_500", -3, "salary", "negative", "A lower income range may require stronger savings or sponsor evidence.", "Prepare bank statements, savings proof, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 1, "salary", "positive", "A stable income range adds support to your financial profile.", "Prepare recent payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 3, "salary", "positive", "A stronger income range supports financial stability.", "Prepare payslips, tax records, and bank statements."),
      rule("monthly_salary_range", "over_2000", 5, "salary", "positive", "A high income range is a strong financial stability signal.", "Prepare income confirmation and bank statements."),
      rule("education_level", "none", -6, "education", "negative", "No education selected weakens the profile.", "Prepare other evidence of stability."),
      rule("home_country_commitments", "yes", 7, "home_ties", "positive", "Ongoing commitments support a credible reason to return home.", "Prepare documents showing your work, study, dependents, or property."),
      rule("home_country_commitments", "no", -7, "home_ties", "negative", "Limited return commitments can weaken non-immigrant intent.", "Strengthen and document your reasons to return home."),
      rule("immediate_relatives_destination", "no", 3, "relatives", "positive", "No immediate relatives in the destination can reduce overstay concerns.", "Document your reason for returning home."),
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
      rule("destination_visa_revoked", "yes", -4, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("immigration_violation", "yes", -5, "immigration_violation", "negative", "A previous overstay, deportation, or removal is a critical risk factor.", "Get expert review and prepare the complete immigration history before applying.", true),
      rule("arrested", "yes", -4, "arrest", "negative", "Arrest history can create complex visa questions.", "Prepare full disclosure documents.", true),
      rule("occupation_status", "unemployed", -1, "occupation", "negative", "No current occupation weakens stability evidence.", "Strengthen home-country ties."),
      rule("regular_monthly_income", "yes", 1, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and statements."),
      rule("regular_monthly_income", "no", -1, "income", "negative", "No regular income can weaken the profile.", "Prepare sponsor or savings evidence."),
      rule("trip_funds_documented", "yes", 2, "funds", "positive", "Documented trip funds support a credible travel plan.", "Prepare bank statements and a realistic trip budget."),
      rule("trip_funds_documented", "no", -3, "funds", "negative", "Insufficient documented trip funds weaken the application.", "Build a clear funding plan before applying."),
      rule("monthly_salary_range", "under_500", -1, "salary", "negative", "A lower salary range may require stronger financial evidence.", "Prepare bank statements, savings proof, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 0, "salary", "positive", "A stable salary range gives some support to your profile.", "Prepare recent payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 1, "salary", "positive", "A stronger salary range supports financial stability.", "Prepare payslips and bank statements."),
      rule("monthly_salary_range", "over_2000", 2, "salary", "positive", "A high salary range is a strong financial stability signal.", "Prepare salary confirmation and bank statements."),
      rule("education_level", "none", -1, "education", "negative", "No education selected weakens the profile.", "Prepare other stability evidence."),
      rule("home_country_commitments", "yes", 2, "home_ties", "positive", "Ongoing commitments support a credible reason to return home.", "Prepare documents showing your work, study, dependents, or property."),
      rule("home_country_commitments", "no", -2, "home_ties", "negative", "Limited return commitments can weaken temporary-resident intent.", "Strengthen and document your reasons to return home."),
      rule("bank_statement_available", "yes", 2, "bank", "positive", "Bank statements are important financial evidence.", "Prepare recent bank statements."),
      rule("bank_statement_available", "no", -2, "bank", "negative", "Missing bank statements can significantly weaken the file.", "Collect statements before applying."),
      rule("immediate_relatives_destination", "no", 1, "relatives", "positive", "No immediate relatives in Canada can reduce overstay concerns.", "Document your return plans."),
      rule("immigration_process_started", "yes", -1, "immigration", "negative", "An immigration process can complicate visitor intent.", "Get expert review before applying."),
    ],
  },
};

const nationalities = [
  label("Georgia", "Georgia", "საქართველო"),
  label("Armenia", "Armenia", "სომხეთი"),
  label("Azerbaijan", "Azerbaijan", "აზერბაიჯანი"),
  label("Turkey", "Turkey", "თურქეთი"),
  label("Ukraine", "Ukraine", "უკრაინა"),
  label("Russia", "Russia", "რუსეთი"),
  label("Kazakhstan", "Kazakhstan", "ყაზახეთი"),
  label("Uzbekistan", "Uzbekistan", "უზბეკეთი"),
  label("India", "India", "ინდოეთი"),
  label("China", "China", "ჩინეთი"),
  label("Philippines", "Philippines", "ფილიპინები"),
  label("United Arab Emirates", "United Arab Emirates", "არაბთა გაერთიანებული საამიროები"),
  label("Israel", "Israel", "ისრაელი"),
  label("United States", "United States", "ამერიკის შეერთებული შტატები"),
  label("Canada", "Canada", "კანადა"),
  label("United Kingdom", "United Kingdom", "გაერთიანებული სამეფო"),
  label("European Union", "European Union country", "ევროკავშირის ქვეყანა"),
  label("Other", "Other nationality", "სხვა მოქალაქეობა"),
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
    image: "/tarot-cards/sun.png",
  },
  {
    name: "The Star",
    image: "/tarot-cards/star.png",
  },
  {
    name: "The Wheel",
    image: "/tarot-cards/compass.png",
  },
  {
    name: "The Moon",
    image: "/tarot-cards/moon.png",
  },
  {
    name: "The Passport",
    image: "/tarot-cards/passport.png",
  },
  {
    name: "The Homeward Path",
    image: "/tarot-cards/home.png",
  },
];

function makeTarotCards(): TarotCard[] {
  return [...tarotDeck].sort(() => Math.random() - 0.5).slice(0, 3);
}

function scoreAssessment(config: DestinationConfig, answers: Record<string, AnswerValue>): ScoreResult {
  const matched = config.rules.filter((ruleItem) => String(answers[ruleItem.questionId]) === ruleItem.answerValue);
  const education = answers.education_level;
  if (education && education !== "none") {
    matched.push(rule("education_level", String(education), config.code === "USA" ? 3 : 1, "education", "positive", "Recognized education supports your profile.", "Prepare diplomas or certificates."));
  }
  const occupation = answers.occupation_status;
  if (occupation && occupation !== "unemployed") {
    matched.push(rule("occupation_status", String(occupation), config.code === "USA" ? 5 : 1, "occupation", "positive", "Occupation or study supports stability evidence.", "Prepare employment, business, study, or retirement documents."));
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
  let score =
    config.scoringMethod === "baseline_adjustment"
      ? clamp((config.baselineScore ?? 50) + adjustment, 5, 95)
      : clamp(mapPointsToScore(adjustment), 5, 95);

  // These answers require case-specific review; a high automated score would be misleading.
  if (answers.destination_visa_revoked === "yes") score = Math.min(score, 35);
  if (answers.arrested === "yes") score = Math.min(score, 45);
  if (answers.immigration_violation === "yes") score = Math.min(score, 25);

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
    travel: item.direction === "positive" ? "საერთაშორისო მოგზაურობის ისტორია აძლიერებს მოგზაურის პროფილს." : "საერთაშორისო მოგზაურობის გამოცდილების არქონა პროფილის ზომიერი სისუსტეა.",
    travel_depth: "რამდენიმე ქვეყანაში მოგზაურობა დადებითად აჩვენებს თქვენს სამოგზაურო გამოცდილებას.",
    screened_travel: "ძლიერი სავიზო ან სასაზღვრო კონტროლის მქონე ქვეყნებში მოგზაურობა დამატებით აძლიერებს თქვენს სანდოობას.",
    prior_visa: "ადრე მიღებული ვიზა დადებითი ფაქტორია.",
    prior_refusal: "წინა უარი ამცირებს შეფასებას და საჭიროებს ახსნას.",
    revoked: "გაუქმებული ვიზა მნიშვნელოვანი რისკ-ფაქტორია.",
    immigration_violation: "ვიზის ვადის დარღვევა, დეპორტაცია ან ქვეყნიდან გაძევება მნიშვნელოვანი რისკ-ფაქტორია.",
    arrest: "დაკავების ისტორია შეიძლება რთულ სავიზო კითხვებს ქმნიდეს.",
    occupation: item.direction === "positive" ? "დასაქმება ან სწავლა აძლიერებს სტაბილურობის მტკიცებულებას." : "ამჟამინდელი საქმიანობის არქონა ასუსტებს სტაბილურობის მტკიცებულებას.",
    income: item.direction === "positive" ? "რეგულარული შემოსავალი აძლიერებს ფინანსურ სტაბილურობას." : "რეგულარული შემოსავლის არქონა ფინანსურ ნაწილს ასუსტებს.",
    funds: item.direction === "positive" ? "მოგზაურობისთვის საკმარისი თანხის დადასტურება აძლიერებს თქვენს ფინანსურ პროფილს." : "მოგზაურობის ხარჯების დაუდასტურებლობა განაცხადის მნიშვნელოვანი სისუსტეა.",
    salary: item.direction === "positive" ? "ხელფასის მითითებული დიაპაზონი მხარს უჭერს ფინანსურ სტაბილურობას." : "ხელფასის დაბალი დიაპაზონი უფრო ძლიერ ფინანსურ მტკიცებულებას მოითხოვს.",
    education: item.direction === "positive" ? "დასრულებული განათლება დადებითად მოქმედებს პროფილის სტაბილურობაზე." : "განათლების არმითითება ან არქონა ასუსტებს პროფილს.",
    home_ties: item.direction === "positive" ? "სამშობლოში არსებული მუდმივი ვალდებულებები დაბრუნების განზრახვას ამყარებს." : "სამშობლოში დაბრუნების დამადასტურებელი კავშირები ამ ეტაპზე სუსტად ჩანს.",
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
    travel: item.direction === "positive" ? "მოამზადეთ პასპორტის შტამპები, წინა ვიზები და მოგზაურობის ისტორია." : "გააძლიერეთ ფინანსური მტკიცებულებები და სამშობლოში დაბრუნების მიზეზების დასაბუთება.",
    travel_depth: "მოამზადეთ პასპორტის შტამპები და წინა ვიზების ასლები.",
    screened_travel: "მოამზადეთ წინა ვიზების ასლები, შესვლის შტამპები და მოგზაურობის თარიღები.",
    prior_visa: "მოამზადეთ ადრე მიღებული ვიზების ასლები.",
    prior_refusal: "მოამზადეთ მოკლე ახსნა, რა შეიცვალა წინა უარის შემდეგ.",
    revoked: "განაცხადამდე მიიღეთ ექსპერტის კონსულტაცია და მოამზადეთ სრული ინფორმაცია.",
    immigration_violation: "განაცხადამდე ექსპერტთან განიხილეთ სრული საიმიგრაციო ისტორია და მოამზადეთ შესაბამისი დოკუმენტები.",
    arrest: "მოამზადეთ სრული დოკუმენტები და მიმართეთ ექსპერტს განაცხადამდე.",
    occupation: "მოამზადეთ დასაქმების, ბიზნესის, სწავლის ან პენსიის დამადასტურებელი დოკუმენტები.",
    income: "მოამზადეთ ხელფასის ცნობები და საბანკო ამონაწერები.",
    funds: "მოამზადეთ საბანკო ამონაწერები და მოგზაურობის რეალისტური ბიუჯეტი.",
    salary: "მოამზადეთ ხელფასის ცნობა, საბანკო ამონაწერები და საჭიროების შემთხვევაში სპონსორის დოკუმენტები.",
    education: "მოამზადეთ დიპლომები, სერტიფიკატები ან სხვა სტაბილურობის მტკიცებულება.",
    home_ties: "მოამზადეთ სამსახურის, სწავლის, ოჯახის წევრებზე ზრუნვის ან ქონების დამადასტურებელი დოკუმენტები.",
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
  const [nationalityConfirmed, setNationalityConfirmed] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "", consent: false });
  const [result, setResult] = useState<ScoreResult | null>(null);

  const t = copy[language];
  const config = destination ? configs[destination] : null;
  const questions = useMemo(() => (config ? visibleQuestions(config, answers) : []), [answers, config]);
  const activeQuestion = questions[step];
  const isContactStep = config && nationalityConfirmed && step >= questions.length && !result;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = getInitialDraft();
      setLanguage(draft.language);
      setDestination(draft.destination);
      setNationality(draft.nationality);
      setNationalityConfirmed(draft.nationalityConfirmed);
      setStep(draft.step);
      setAnswers(draft.answers);
      setDraftRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({ language, destination, nationality, nationalityConfirmed, step, answers }),
    );
  }, [answers, destination, draftRestored, language, nationality, nationalityConfirmed, step]);

  function chooseAnswer(questionId: string, value: AnswerValue) {
    setAnswers((current) => {
      const nextAnswers = { ...current, [questionId]: value };
      if (questionId === "international_travel" && value !== "yes") {
        delete nextAnswers.countries_visited_count;
        delete nextAnswers.visited_countries;
      }
      if (questionId === "regular_monthly_income" && value !== "yes") {
        delete nextAnswers.monthly_salary_range;
      }
      return nextAnswers;
    });
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
    else setNationalityConfirmed(false);
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
    setNationalityConfirmed(false);
    setStep(0);
    setAnswers({});
    setContact({ name: "", email: "", phone: "", consent: false });
    setResult(null);
    window.localStorage.removeItem(draftKey);
  }

  function startDestination(code: DestinationCode) {
    setDestination(code);
    setNationality("");
    setNationalityConfirmed(false);
    setStep(0);
    setAnswers({});
    setContact({ name: "", email: "", phone: "", consent: false });
    setResult(null);
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
              <div className="space-y-5">
                <h1 className="hero-heading">
                  {language === "en" ? <>Check Your Visa <span>Chances</span></> : <>შეაფასეთ ვიზის მიღების <span>შანსები</span></>}
                </h1>
                <p className="max-w-lg text-lg leading-8 text-[#6b6a62]">{t.subhead}</p>
              </div>
            </div>
          </aside>
          )}

          <section className={destination ? "app-panel quiz-panel" : "app-panel destination-section"}>
            {!destination && (
              <div className="flow-space">
                <p className="section-kicker">{t.destinationKicker}</p>
                <h2>{t.destination}</h2>
                <div className="destination-row">
                  {(Object.keys(configs) as DestinationCode[]).map((code) => (
                    <button className="destination-card" key={code} onClick={() => startDestination(code)}>
                      <span className="flag" aria-hidden="true">{code === "USA" ? "🇺🇸" : "🇨🇦"}</span>
                      <span>
                        <strong>{code === "USA" ? t.usName : t.canadaName}</strong>
                        <small>{code === "USA" ? t.usProfile : t.canadaProfile}</small>
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

            {destination && !nationalityConfirmed && (
              <div className="flow-space">
                <Progress current={1} total={4} />
                <h2>{t.nationality}</h2>
                <select
                  className="text-input nationality-select"
                  onChange={(event) => setNationality(event.target.value)}
                  value={nationality}
                >
                  <option value="">{t.nationalityPlaceholder}</option>
                  {nationalities.map((item) => (
                    <option key={item.value} value={item.value}>{item.label[language]}</option>
                  ))}
                </select>
                <div className="actions">
                  <button className="ghost-button" onClick={() => { setDestination(""); setNationality(""); }}>{t.back}</button>
                  <button className="primary-button" disabled={!nationality} onClick={() => { setStep(0); setNationalityConfirmed(true); }}>{t.next}</button>
                </div>
              </div>
            )}

            {activeQuestion && !result && nationalityConfirmed && (
              <div className="flow-space">
                <Progress current={Math.min(step + 2, questions.length + 1)} total={questions.length + 2} />
                <p className="eyebrow">{destination === "USA" ? t.usName : t.canadaName} {t.assessment}</p>
                <h2>{activeQuestion.text[language] || activeQuestion.text.en}</h2>
                {activeQuestion.type === "single_choice" && (
                  <div className="choice-grid">
                    {activeQuestion.options?.map((option) => (
                      <button
                        className={`choice-card ${answers[activeQuestion.id] === option.value ? "selected" : ""}`}
                        key={option.value}
                        onClick={() => chooseAnswer(activeQuestion.id, option.value)}
                      >
                        <strong>{option.label[language] || option.label.en}</strong>
                      </button>
                    ))}
                  </div>
                )}
                {activeQuestion.type === "multi_choice" && (
                  <div className="choice-grid multi-choice-grid">
                    {activeQuestion.options?.map((option) => {
                      const currentAnswer = answers[activeQuestion.id];
                      const selected = Array.isArray(currentAnswer) ? currentAnswer.includes(option.value) : false;
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" src={card.image} />
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
                <strong>{t.stepOneTitle}</strong>
                <p>{t.stepOneText}</p>
              </div>
              <div>
                <span aria-hidden="true">%</span>
                <strong>{t.stepTwoTitle}</strong>
                <p>{t.stepTwoText}</p>
              </div>
              <div>
                <span aria-hidden="true">✓</span>
                <strong>{t.stepThreeTitle}</strong>
                <p>{t.stepThreeText}</p>
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
