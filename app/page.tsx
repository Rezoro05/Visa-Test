"use client";

import { useEffect, useMemo, useState } from "react";
import { georgianTranslations } from "./georgian-translations";

type Language = "en" | "ka";
type DestinationCode = "USA" | "CANADA" | "UK";
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

const draftKey = "test_visa_draft_v6";
const whatsappNumber = "995596114488";

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
      "Answer a few plain questions and get an evidence-based visitor-visa approval estimate in minutes.",
    nationality: "What is your nationality?",
    nationalityPlaceholder: "Select your nationality",
    back: "Back",
    next: "Next",
    contactTitle: "Almost done. Where should eConsul reach you?",
    contactLead: "Where do you want us to send your results?",
    contactHint: "Add the best contact details, and we will use them to share your assessment result and help if you ask for expert support.",
    resultTitle: "Estimated approval likelihood",
    consent:
      "I agree that eConsul may contact me by phone, email, or messaging apps about my visa assessment and related services.",
    showResult: "Show My Result",
    strengths: "What helps your profile",
    risks: "What may weaken your profile",
    nextSteps: "What to do next",
    expert: "Continue with an eConsul Visa Expert",
    startOver: "Start Over",
    disclaimer:
      "This estimate compares your answers with published visitor-visa decision factors. Officers assess every case individually and may rely on information or documents this test cannot verify. It is not a government decision, legal advice, or a guarantee of approval.",
    estimateNote: "Indicative estimate based on self-reported answers",
    manual:
      "Your answers include a complex risk factor. A normal percentage may not tell the full story, so expert review is recommended before applying.",
    fullName: "Full name",
    email: "Email",
    phone: "Phone with country code",
    emptyStrengths: "No strong positive factors captured yet.",
    emptyRisks: "No material risk factors identified from these answers.",
    assessment: "assessment",
    usProfile: "B1/B2 visitor profile",
    canadaProfile: "Visitor visa profile",
    ukProfile: "Standard Visitor visa profile",
    usName: "United States",
    canadaName: "Canada",
    ukName: "United Kingdom",
    stepOneTitle: "Answer simple questions",
    stepOneText: "Plain questions, no jargon.",
    stepTwoTitle: "Get your approval estimate",
    stepTwoText: "Based on published decision factors.",
    stepThreeTitle: "See what to improve",
    stepThreeText: "Strengths, risks, and next steps.",
  },
  ka: {
    start: "დაწყება",
    headline: "შეამოწმეთ სავიზო მზაობა",
    subhead:
      "უპასუხეთ რამდენიმე მარტივ კითხვას და გაიგე ვიზის მიღების ალბათობა",
    nationality: "რომელი ქვეყნის მოქალაქე ხართ?",
    nationalityPlaceholder: "აირჩიეთ მოქალაქეობა",
    back: "უკან",
    next: "შემდეგი",
    contactTitle: "თითქმის დასრულებულია",
    contactLead: "სად გსურთ გამოგიგზავნოთ შედეგი?",
    contactHint: "მიუთითეთ თქვენთვის მოსახერხებელი საკონტაქტო ინფორმაცია. მას შედეგის გამოსაგზავნად და, თქვენი სურვილის შემთხვევაში, ექსპერტთან დასაკავშირებლად გამოვიყენებთ.",
    resultTitle: "ვიზის მიღების სავარაუდო ალბათობა",
    consent:
      "ვეთანხმები, რომ eConsul დამიკავშირდეს ტელეფონით, ელფოსტით ან შეტყობინებების აპებით ჩემი სავიზო შეფასებისა და შესაბამისი მომსახურებების შესახებ.",
    showResult: "შედეგის ნახვა",
    strengths: "რა აძლიერებს თქვენს პროფილს",
    risks: "რა შეიძლება ასუსტებდეს თქვენს პროფილს",
    nextSteps: "რა მოამზადოთ შემდეგ",
    expert: "eConsul-ის ვიზის ექსპერტთან გაგრძელება",
    startOver: "თავიდან დაწყება",
    disclaimer:
      "ეს შეფასება თქვენს პასუხებს ვიზიტორის ვიზის შესახებ ოფიციალურად გამოქვეყნებულ გადაწყვეტილების ფაქტორებს ადარებს. თითოეულ განაცხადს ოფიცერი ინდივიდუალურად განიხილავს და შესაძლოა დაეყრდნოს ინფორმაციას ან დოკუმენტებს, რომელთა გადამოწმებაც ამ ტესტს არ შეუძლია. შედეგი არ წარმოადგენს სახელმწიფო ორგანოს გადაწყვეტილებას, იურიდიულ კონსულტაციას ან ვიზის გაცემის გარანტიას.",
    estimateNote: "საორიენტაციო შეფასება თქვენ მიერ მითითებულ ინფორმაციაზე დაყრდნობით",
    manual:
      "თქვენს პასუხებში ჩანს კომპლექსური რისკ-ფაქტორი. მხოლოდ პროცენტული შეფასება სრულ სურათს ვერ აჩვენებს, ამიტომ განაცხადამდე რეკომენდებულია ექსპერტის კონსულტაცია.",
    fullName: "სახელი და გვარი",
    email: "ელფოსტა",
    phone: "ტელეფონი ქვეყნის კოდით",
    emptyStrengths: "ამ ეტაპზე ძლიერი დადებითი ფაქტორი არ დაფიქსირდა.",
    emptyRisks: "ამ წინასწარი შეფასებით მნიშვნელოვანი რისკ-ფაქტორი არ გამოვლენილა.",
    assessment: "შეფასება",
    usProfile: "B1/B2 ვიზიტორის ვიზა",
    canadaProfile: "ვიზიტორის ვიზა",
    ukProfile: "სტანდარტული ვიზიტორის ვიზა",
    usName: "ამერიკის შეერთებული შტატები",
    canadaName: "კანადა",
    ukName: "გაერთიანებული სამეფო",
    stepOneTitle: "უპასუხეთ მარტივ კითხვებს",
    stepOneText: "მარტივი და გასაგები კითხვები.",
    stepTwoTitle: "მიიღეთ ვიზის ალბათობის შეფასება",
    stepTwoText: "ოფიციალურად გამოქვეყნებულ ფაქტორებზე დაყრდნობით.",
    stepThreeTitle: "ნახეთ, რა არის გასაუმჯობესებელი",
    stepThreeText: "ძლიერი მხარეები, რისკები და შემდეგი ნაბიჯები.",
  },
} satisfies Record<Language, Record<string, string>>;

const sharedQuestions: Question[] = [
  {
    id: "trip_purpose",
    type: "single_choice",
    text: { en: "What is the main purpose of your trip?", ka: "რა არის თქვენი მოგზაურობის მთავარი მიზანი?" },
    options: [
      label("tourism", "Tourism / holiday", "ტურიზმი / დასვენება"),
      label("family_visit", "Visit family or friends", "ოჯახის წევრების ან მეგობრების მონახულება"),
      label("business", "Business meeting or event", "საქმიანი შეხვედრა ან ღონისძიება"),
      label("medical", "Medical visit", "სამედიცინო ვიზიტი"),
      label("other", "Other", "სხვა"),
    ],
  },
  {
    id: "trip_duration",
    type: "single_choice",
    text: { en: "How long do you plan to stay?", ka: "რამდენ ხანს გეგმავთ დარჩენას?" },
    options: [
      label("under_2_weeks", "Up to 2 weeks", "2 კვირამდე"),
      label("two_to_four_weeks", "2-4 weeks", "2-4 კვირა"),
      label("one_to_three_months", "1-3 months", "1-3 თვე"),
      label("over_three_months", "More than 3 months", "3 თვეზე მეტი"),
    ],
  },
  {
    id: "specific_trip_plan",
    type: "single_choice",
    text: {
      en: "Do you have a specific itinerary, dates, accommodation, and reason for this trip?",
      ka: "გაქვთ მოგზაურობის კონკრეტული გეგმა, თარიღები, საცხოვრებელი და ვიზიტის მკაფიო მიზეზი?",
    },
    options: yesNo(),
  },
  {
    id: "trip_funding_source",
    type: "single_choice",
    text: { en: "Who will pay for most of the trip?", ka: "ვინ დაფარავს მოგზაურობის ხარჯების ძირითად ნაწილს?" },
    options: [
      label("self", "I will pay", "მე გადავიხდი"),
      label("mixed", "I will pay with some support", "ნაწილს მე გადავიხდი, ნაწილში დამეხმარებიან"),
      label("sponsor", "Another person or organization", "სხვა პირი ან ორგანიზაცია"),
    ],
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
      label("other", "Other country", "სხვა ქვეყანა"),
    ],
  },
  {
    id: "previous_travel_compliance",
    type: "single_choice",
    showIf: { questionId: "international_travel", equals: "yes" },
    text: {
      en: "On previous trips, did you always leave on time and follow the visa or entry conditions?",
      ka: "წინა მოგზაურობებისას ყოველთვის დროულად დატოვეთ ქვეყანა და დაიცავით ვიზის ან შესვლის პირობები?",
    },
    options: yesNo(),
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
    id: "circumstances_changed_since_refusal",
    type: "single_choice",
    showIf: { questionId: "previous_destination_visa_result", equals: "refused" },
    text: {
      en: "Since the refusal, have your circumstances or supporting evidence materially improved?",
      ka: "უარის შემდეგ მნიშვნელოვნად გაუმჯობესდა თქვენი გარემოებები ან დამადასტურებელი დოკუმენტები?",
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
    id: "current_status_duration",
    type: "single_choice",
    text: {
      en: "How long have you been in your current work, business, study, or retirement situation?",
      ka: "რამდენი ხანია, რაც ამჟამინდელ სამსახურში, ბიზნესში, სასწავლებელში ან საპენსიო სტატუსში ხართ?",
    },
    options: [
      label("under_6_months", "Less than 6 months", "6 თვეზე ნაკლები"),
      label("six_to_twenty_four_months", "6 months-2 years", "6 თვიდან 2 წლამდე"),
      label("over_two_years", "More than 2 years", "2 წელზე მეტი"),
      label("not_applicable", "Not applicable", "არ ვრცელდება"),
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
    id: "home_country_commitments",
    type: "multi_choice",
    text: {
      en: "What ongoing commitments do you have right now?",
      ka: "რა მიმდინარე ვალდებულებები გაქვთ ამჟამად?",
    },
    options: [
      label("employment", "Employment / work", "სამსახური / დასაქმება"),
      label("business", "Business ownership or self-employment", "ბიზნესი ან თვითდასაქმება"),
      label("study", "Studies", "სწავლა"),
      label("dependants", "Dependants or family care", "კმაყოფაზე მყოფი პირები ან ოჯახის წევრებზე ზრუნვა"),
      label("property", "Property or long-term housing", "ქონება ან გრძელვადიანი საცხოვრებელი"),
      label("financial", "Significant financial obligations", "მნიშვნელოვანი ფინანსური ვალდებულებები"),
      label("other_commitment", "Other ongoing commitments", "სხვა მიმდინარე ვალდებულებები"),
      label("none", "None of these", "არცერთი ჩამოთვლილთაგან"),
    ],
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
    travelPointsPerGroup: 2,
    travelCap: 6,
    questions: [...sharedQuestions],
    rules: [
      rule("trip_purpose", "tourism", 2, "purpose", "positive", "Tourism is a legitimate visitor purpose when the plan is specific and temporary.", "Prepare a concise itinerary and evidence supporting the trip."),
      rule("trip_purpose", "business", 2, "purpose", "positive", "A documented business meeting or event can support a legitimate temporary purpose.", "Prepare the event, employer, and itinerary evidence."),
      rule("trip_purpose", "medical", -2, "purpose", "negative", "Medical travel requires a detailed treatment and funding plan.", "Prepare provider confirmation, projected costs, and proof of payment resources."),
      rule("trip_purpose", "other", -4, "purpose", "negative", "An unclear or unusual purpose needs stronger explanation.", "Prepare a precise, documented explanation of the trip."),
      rule("trip_duration", "under_2_weeks", 4, "duration", "positive", "A short stay is easier to align with a limited visitor purpose.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "two_to_four_weeks", 2, "duration", "positive", "A clearly planned stay of up to four weeks can support temporary intent.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "one_to_three_months", -4, "duration", "negative", "A longer stay requires stronger purpose, funding, and return evidence.", "Explain why this duration is necessary and document the full budget."),
      rule("trip_duration", "over_three_months", -9, "duration", "negative", "A stay over three months can be difficult to reconcile with ordinary visitor plans.", "Reassess the duration or prepare unusually strong purpose and return evidence."),
      rule("specific_trip_plan", "yes", 7, "trip_plan", "positive", "Specific dates, accommodation, and activities support a credible temporary trip.", "Keep the itinerary consistent with your application and interview answers."),
      rule("specific_trip_plan", "no", -10, "trip_plan", "negative", "A vague trip plan weakens the stated visitor purpose.", "Create a realistic itinerary with dates, accommodation, and expected costs."),
      rule("trip_funding_source", "self", 2, "funding_source", "positive", "Self-funding can support financial independence when the money is documented.", "Prepare statements showing the funds are genuinely available to you."),
      rule("international_travel", "yes", 4, "travel", "positive", "Prior compliant international travel supports a credible travel profile.", "Collect passport stamps and prior travel records."),
      rule("international_travel", "no", -3, "travel", "negative", "No prior international travel leaves less evidence of travel compliance.", "Strengthen your trip purpose, finances, and reasons to return home."),
      rule("previous_travel_compliance", "yes", 5, "travel_compliance", "positive", "Following previous visa and entry conditions supports credibility.", "Prepare prior visas and entry or exit records."),
      rule("previous_travel_compliance", "no", -20, "travel_compliance", "negative", "A previous breach of immigration conditions is a critical risk.", "Get expert review and prepare the complete history before applying.", true),
      rule("previous_destination_visa_result", "issued", 8, "prior_visa", "positive", "A previous issued U.S. visa with compliant use is a strong factor.", "Prepare the prior visa and travel records."),
      rule("previous_destination_visa_result", "refused", -8, "prior_refusal", "negative", "A previous refusal remains relevant unless circumstances have materially changed.", "Prepare a clear explanation of what has changed since the refusal."),
      rule("circumstances_changed_since_refusal", "yes", 3, "refusal_change", "positive", "Materially improved circumstances can help address a prior refusal.", "Document each important change since the refusal."),
      rule("circumstances_changed_since_refusal", "no", -8, "refusal_change", "negative", "Reapplying without a meaningful change may lead to the same concerns.", "Delay reapplication until you can show a material change."),
      rule("destination_visa_revoked", "yes", -15, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("immigration_violation", "yes", -20, "immigration_violation", "negative", "A previous overstay, deportation, or removal is a critical risk factor.", "Get expert review and prepare the complete immigration history before applying.", true),
      rule("arrested", "yes", -12, "arrest", "negative", "Criminal history can create inadmissibility or disclosure questions.", "Prepare complete court records and get expert review.", true),
      rule("occupation_status", "unemployed", -7, "occupation", "negative", "No current occupation weakens an important home-country tie.", "Strengthen other financial and home-country ties."),
      rule("current_status_duration", "under_6_months", -3, "status_duration", "negative", "A recently started job, business, or study program is a weaker established tie.", "Prepare contracts, enrollment records, and approved leave evidence."),
      rule("current_status_duration", "six_to_twenty_four_months", 2, "status_duration", "positive", "An established current activity supports stability.", "Prepare employment, business, study, or retirement evidence."),
      rule("current_status_duration", "over_two_years", 5, "status_duration", "positive", "Long-term work, business, study, or retirement status is a strong stability signal.", "Prepare evidence showing continuity and approved leave."),
      rule("regular_monthly_income", "yes", 4, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and bank statements."),
      rule("regular_monthly_income", "no", -5, "income", "negative", "No regular income can weaken financial stability.", "Prepare genuine savings or clearly documented sponsor evidence."),
      rule("trip_funds_documented", "yes", 8, "funds", "positive", "Documented funds matched to the itinerary support the ability to pay for the trip.", "Prepare bank statements and a realistic trip budget."),
      rule("trip_funds_documented", "no", -15, "funds", "negative", "Insufficient documented funds are a major weakness.", "Build and document a credible funding plan before applying."),
      rule("monthly_salary_range", "under_500", -3, "salary", "negative", "A lower income range may require stronger savings or sponsor evidence.", "Prepare bank statements, savings proof, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 1, "salary", "positive", "A stable income range adds support to your financial profile.", "Prepare recent payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 2, "salary", "positive", "A stronger income range supports financial stability.", "Prepare payslips, tax records, and bank statements."),
      rule("monthly_salary_range", "over_2000", 3, "salary", "positive", "A higher income range supports financial stability when consistent with records.", "Prepare income confirmation and bank statements."),
    ],
  },
  CANADA: {
    code: "CANADA",
    label: "Canada",
    scoringMethod: "baseline_adjustment",
    baselineScore: 50,
    travelPointsPerGroup: 2,
    travelCap: 6,
    questions: [
      ...sharedQuestions,
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
      rule("trip_purpose", "tourism", 2, "purpose", "positive", "Tourism is a legitimate visitor purpose when the plan is specific and temporary.", "Prepare a concise itinerary and evidence supporting the trip."),
      rule("trip_purpose", "business", 2, "purpose", "positive", "A documented business meeting or event can support a legitimate temporary purpose.", "Prepare event, employer, and itinerary evidence."),
      rule("trip_purpose", "medical", -2, "purpose", "negative", "Medical travel requires a detailed treatment and funding plan.", "Prepare provider confirmation, projected costs, and funding evidence."),
      rule("trip_purpose", "other", -4, "purpose", "negative", "An unclear or unusual purpose needs stronger explanation.", "Prepare a precise, documented explanation of the trip."),
      rule("trip_duration", "under_2_weeks", 4, "duration", "positive", "A short stay is easier to align with a limited visitor purpose.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "two_to_four_weeks", 2, "duration", "positive", "A clearly planned stay of up to four weeks supports temporary intent.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "one_to_three_months", -4, "duration", "negative", "A longer stay requires stronger purpose, funding, and return evidence.", "Explain why this duration is necessary and document the full budget."),
      rule("trip_duration", "over_three_months", -8, "duration", "negative", "A long visit can require unusually strong evidence of purpose and departure.", "Reassess the duration or prepare strong purpose and return evidence."),
      rule("specific_trip_plan", "yes", 6, "trip_plan", "positive", "Specific dates, accommodation, and activities support a credible visit.", "Keep the itinerary consistent throughout the application."),
      rule("specific_trip_plan", "no", -10, "trip_plan", "negative", "A vague trip plan weakens the purpose of visit.", "Create a realistic itinerary with dates, accommodation, and costs."),
      rule("trip_funding_source", "self", 2, "funding_source", "positive", "Self-funding can support financial independence when documented.", "Prepare statements showing the funds are available to you."),
      rule("international_travel", "yes", 4, "travel", "positive", "Prior compliant international travel supports credibility.", "Gather visas, stamps, and travel records."),
      rule("international_travel", "no", -3, "travel", "negative", "No prior international travel leaves less evidence of compliance.", "Strengthen purpose, finances, and reasons to return."),
      rule("previous_travel_compliance", "yes", 5, "travel_compliance", "positive", "Following previous entry conditions supports credibility.", "Prepare prior visas and entry or exit records."),
      rule("previous_travel_compliance", "no", -18, "travel_compliance", "negative", "A previous breach of immigration conditions is a critical risk.", "Get expert review and prepare the complete history.", true),
      rule("previous_destination_visa_result", "issued", 6, "prior_visa", "positive", "A previous issued Canadian visa with compliant use supports the profile.", "Prepare prior visa and travel records."),
      rule("previous_destination_visa_result", "refused", -7, "prior_refusal", "negative", "A previous refusal remains relevant unless concerns have been addressed.", "Explain and document what changed since refusal."),
      rule("circumstances_changed_since_refusal", "yes", 3, "refusal_change", "positive", "Materially improved circumstances can help address a prior refusal.", "Document each important change since refusal."),
      rule("circumstances_changed_since_refusal", "no", -8, "refusal_change", "negative", "Reapplying without meaningful change may repeat the same concerns.", "Delay reapplication until the refusal grounds are addressed."),
      rule("destination_visa_revoked", "yes", -15, "revoked", "negative", "A revoked visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("immigration_violation", "yes", -20, "immigration_violation", "negative", "A previous overstay, deportation, or removal is a critical risk factor.", "Get expert review and prepare the complete immigration history.", true),
      rule("arrested", "yes", -12, "arrest", "negative", "Criminal history may create inadmissibility or disclosure issues.", "Prepare complete records and get expert review.", true),
      rule("occupation_status", "unemployed", -7, "occupation", "negative", "No current occupation weakens an important home-country tie.", "Strengthen other financial and home-country ties."),
      rule("current_status_duration", "under_6_months", -3, "status_duration", "negative", "A recently started activity is a weaker established tie.", "Prepare contracts, enrollment records, and leave evidence."),
      rule("current_status_duration", "six_to_twenty_four_months", 2, "status_duration", "positive", "An established current activity supports stability.", "Prepare work, business, study, or retirement evidence."),
      rule("current_status_duration", "over_two_years", 5, "status_duration", "positive", "Long-term work, business, study, or retirement status supports stability.", "Prepare evidence showing continuity."),
      rule("regular_monthly_income", "yes", 4, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and statements."),
      rule("regular_monthly_income", "no", -5, "income", "negative", "No regular income weakens financial stability.", "Prepare genuine savings or documented sponsor evidence."),
      rule("trip_funds_documented", "yes", 8, "funds", "positive", "Documented funds matched to the visit support the ability to pay.", "Prepare bank statements and a realistic trip budget."),
      rule("trip_funds_documented", "no", -15, "funds", "negative", "Insufficient documented funds are a major weakness.", "Build and document a credible funding plan."),
      rule("monthly_salary_range", "under_500", -3, "salary", "negative", "A lower income range may require stronger savings or sponsor evidence.", "Prepare statements, savings, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 1, "salary", "positive", "A stable income gives some financial support.", "Prepare payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 2, "salary", "positive", "A stronger income range supports financial stability.", "Prepare payslips and bank statements."),
      rule("monthly_salary_range", "over_2000", 3, "salary", "positive", "A higher consistent income supports financial stability.", "Prepare income confirmation and statements."),
      rule("bank_statement_available", "yes", 6, "bank", "positive", "Several months of bank history support the financial assessment.", "Prepare complete recent bank statements."),
      rule("bank_statement_available", "no", -8, "bank", "negative", "Missing bank history significantly weakens financial evidence.", "Collect complete statements before applying."),
      rule("immigration_process_started", "yes", -3, "immigration", "negative", "A separate immigration process requires a clear temporary-visit explanation.", "Explain how you will still leave Canada at the end of this visit."),
    ],
  },
  UK: {
    code: "UK",
    label: "United Kingdom",
    scoringMethod: "baseline_adjustment",
    baselineScore: 50,
    travelPointsPerGroup: 2,
    travelCap: 6,
    questions: [
      ...sharedQuestions,
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
        id: "frequent_destination_visits",
        type: "single_choice",
        text: {
          en: "Have you made frequent or long visits to the UK during the past 2 years?",
          ka: "ბოლო 2 წლის განმავლობაში ხშირად ან ხანგრძლივად ყოფილხართ გაერთიანებულ სამეფოში?",
        },
        options: yesNo(),
      },
    ],
    rules: [
      rule("trip_purpose", "tourism", 2, "purpose", "positive", "Tourism is a permitted visitor purpose when the plan is specific and temporary.", "Prepare a concise itinerary and evidence supporting the trip."),
      rule("trip_purpose", "family_visit", 2, "purpose", "positive", "Visiting family or friends is permitted when the visit is genuine and temporary.", "Prepare host details, accommodation plans, and evidence of your return plans."),
      rule("trip_purpose", "business", 2, "purpose", "positive", "A documented permitted business activity can support a genuine visitor purpose.", "Prepare invitation, employer, event, and itinerary evidence."),
      rule("trip_purpose", "medical", -2, "purpose", "negative", "Private medical travel requires detailed treatment, duration, and funding evidence.", "Prepare provider confirmation, projected costs, treatment duration, and funding evidence."),
      rule("trip_purpose", "other", -4, "purpose", "negative", "An unclear or potentially non-permitted purpose needs stronger explanation.", "Confirm that the planned activity is permitted and document it precisely."),
      rule("trip_duration", "under_2_weeks", 4, "duration", "positive", "A short stay is easier to align with a limited visitor purpose.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "two_to_four_weeks", 2, "duration", "positive", "A clearly planned stay of up to four weeks can support a temporary visit.", "Match your itinerary and budget to the stated dates."),
      rule("trip_duration", "one_to_three_months", -4, "duration", "negative", "A longer stay requires stronger evidence of purpose, funding, and departure.", "Explain why this duration is necessary and document the full budget."),
      rule("trip_duration", "over_three_months", -8, "duration", "negative", "A visit over three months may raise questions about making the UK a main home.", "Reassess the duration or prepare unusually strong purpose and departure evidence."),
      rule("specific_trip_plan", "yes", 7, "trip_plan", "positive", "Specific dates, accommodation, activities, and costs support a genuine visit.", "Keep the itinerary consistent throughout the application."),
      rule("specific_trip_plan", "no", -11, "trip_plan", "negative", "A vague trip plan weakens the genuine visitor assessment.", "Create a realistic itinerary with dates, accommodation, activities, and costs."),
      rule("trip_funding_source", "self", 2, "funding_source", "positive", "Self-funding can support financial independence when the funds are documented.", "Prepare statements showing the funds are genuinely available to you."),
      rule("international_travel", "yes", 4, "travel", "positive", "Prior compliant international travel supports credibility.", "Gather visas, stamps, and travel records."),
      rule("international_travel", "no", -3, "travel", "negative", "No prior international travel leaves less evidence of travel compliance.", "Strengthen the trip purpose, finances, and reasons to return home."),
      rule("previous_travel_compliance", "yes", 5, "travel_compliance", "positive", "Following previous visa and entry conditions supports credibility.", "Prepare prior visas and entry or exit records."),
      rule("previous_travel_compliance", "no", -20, "travel_compliance", "negative", "A previous breach of immigration conditions is a critical risk.", "Get expert review and prepare the complete immigration history.", true),
      rule("previous_destination_visa_result", "issued", 7, "prior_visa", "positive", "A previously issued UK visa with compliant use supports the profile.", "Prepare the prior visa and UK travel records."),
      rule("previous_destination_visa_result", "refused", -8, "prior_refusal", "negative", "A previous UK refusal remains relevant unless the concerns have been addressed.", "Explain and document what changed since the refusal."),
      rule("circumstances_changed_since_refusal", "yes", 3, "refusal_change", "positive", "Materially improved circumstances can help address a prior refusal.", "Document each important change since the refusal."),
      rule("circumstances_changed_since_refusal", "no", -8, "refusal_change", "negative", "Reapplying without meaningful change may repeat the same concerns.", "Delay reapplication until the refusal grounds are addressed."),
      rule("destination_visa_revoked", "yes", -15, "revoked", "negative", "A canceled or revoked UK visa is a serious risk factor.", "Seek expert review before applying.", true),
      rule("immigration_violation", "yes", -20, "immigration_violation", "negative", "A previous overstay, deportation, or removal is a critical suitability risk.", "Get expert review and prepare the complete immigration history.", true),
      rule("arrested", "yes", -12, "arrest", "negative", "Criminal history may create suitability or disclosure issues.", "Prepare complete records and get expert review.", true),
      rule("occupation_status", "unemployed", -7, "occupation", "negative", "No current occupation weakens an important home-country circumstance.", "Strengthen other financial and home-country evidence."),
      rule("current_status_duration", "under_6_months", -3, "status_duration", "negative", "A recently started activity is a weaker established home-country circumstance.", "Prepare contracts, enrollment records, and leave evidence."),
      rule("current_status_duration", "six_to_twenty_four_months", 2, "status_duration", "positive", "An established current activity supports stability.", "Prepare work, business, study, or retirement evidence."),
      rule("current_status_duration", "over_two_years", 5, "status_duration", "positive", "Long-term work, business, study, or retirement status supports stability.", "Prepare evidence showing continuity."),
      rule("regular_monthly_income", "yes", 4, "income", "positive", "Regular income supports financial stability.", "Prepare payslips and statements."),
      rule("regular_monthly_income", "no", -5, "income", "negative", "No regular income weakens financial stability.", "Prepare genuine savings or documented sponsor evidence."),
      rule("trip_funds_documented", "yes", 9, "funds", "positive", "Documented funds covering the visit and return journey support the application.", "Prepare bank statements and a realistic trip budget."),
      rule("trip_funds_documented", "no", -16, "funds", "negative", "Insufficient documented funds are a major eligibility weakness.", "Build and document a credible funding plan before applying."),
      rule("monthly_salary_range", "under_500", -3, "salary", "negative", "A lower income range may require stronger savings or sponsor evidence.", "Prepare statements, savings, or sponsor documents."),
      rule("monthly_salary_range", "500_1000", 1, "salary", "positive", "A stable income gives some financial support.", "Prepare payslips and employment confirmation."),
      rule("monthly_salary_range", "1000_2000", 2, "salary", "positive", "A stronger income range supports financial stability.", "Prepare payslips and bank statements."),
      rule("monthly_salary_range", "over_2000", 3, "salary", "positive", "A higher consistent income supports financial stability.", "Prepare income confirmation and statements."),
      rule("bank_statement_available", "yes", 6, "bank", "positive", "Several months of bank history support the source and availability of funds.", "Prepare complete recent bank statements and explain unusual deposits."),
      rule("bank_statement_available", "no", -9, "bank", "negative", "Missing bank history significantly weakens financial evidence.", "Collect complete statements before applying."),
      rule("frequent_destination_visits", "yes", -8, "visit_pattern", "negative", "Frequent or extended UK visits may raise concerns that the UK is becoming your main home.", "Explain the pattern, purpose, time spent outside the UK, and continuing home-country commitments."),
    ],
  },
};

const countryCodes = [
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI",
  "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ",
  "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
  "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY",
  "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT",
  "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU",
  "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
  "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM",
  "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA",
  "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY",
  "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV",
  "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW", "XK",
] as const;

const georgianCountryNames: Partial<Record<(typeof countryCodes)[number], string>> = {
  AF: "ავღანეთი",
  AL: "ალბანეთი",
  DZ: "ალჟირი",
  AD: "ანდორა",
  AO: "ანგოლა",
  AG: "ანტიგუა და ბარბუდა",
  AR: "არგენტინა",
  AM: "სომხეთი",
  AU: "ავსტრალია",
  AT: "ავსტრია",
  AZ: "აზერბაიჯანი",
  BS: "ბაჰამის კუნძულები",
  BH: "ბაჰრეინი",
  BD: "ბანგლადეში",
  BB: "ბარბადოსი",
  BY: "ბელარუსი",
  BE: "ბელგია",
  BZ: "ბელიზი",
  BJ: "ბენინი",
  BT: "ბუტანი",
  BO: "ბოლივია",
  BA: "ბოსნია და ჰერცეგოვინა",
  BW: "ბოტსვანა",
  BR: "ბრაზილია",
  BN: "ბრუნეი",
  BG: "ბულგარეთი",
  BF: "ბურკინა-ფასო",
  BI: "ბურუნდი",
  CV: "კაბო-ვერდე",
  KH: "კამბოჯა",
  CM: "კამერუნი",
  CA: "კანადა",
  CF: "ცენტრალური აფრიკის რესპუბლიკა",
  TD: "ჩადი",
  CL: "ჩილე",
  CN: "ჩინეთი",
  CO: "კოლუმბია",
  KM: "კომორის კუნძულები",
  CG: "კონგო - ბრაზავილი",
  CD: "კონგო - კინშასა",
  CR: "კოსტა-რიკა",
  CI: "კოტ-დივუარი",
  HR: "ხორვატია",
  CU: "კუბა",
  CY: "კვიპროსი",
  CZ: "ჩეხეთი",
  DK: "დანია",
  DJ: "ჯიბუტი",
  DM: "დომინიკა",
  DO: "დომინიკელთა რესპუბლიკა",
  EC: "ეკვადორი",
  EG: "ეგვიპტე",
  SV: "სალვადორი",
  GQ: "ეკვატორული გვინეა",
  ER: "ერიტრეა",
  EE: "ესტონეთი",
  SZ: "სვაზილენდი",
  ET: "ეთიოპია",
  FJ: "ფიჯი",
  FI: "ფინეთი",
  FR: "საფრანგეთი",
  GA: "გაბონი",
  GM: "გამბია",
  GE: "საქართველო",
  DE: "გერმანია",
  GH: "განა",
  GR: "საბერძნეთი",
  GD: "გრენადა",
  GT: "გვატემალა",
  GN: "გვინეა",
  GW: "გვინეა-ბისაუ",
  GY: "გაიანა",
  HT: "ჰაიტი",
  HN: "ჰონდურასი",
  HU: "უნგრეთი",
  IS: "ისლანდია",
  IN: "ინდოეთი",
  ID: "ინდონეზია",
  IR: "ირანი",
  IQ: "ერაყი",
  IE: "ირლანდია",
  IL: "ისრაელი",
  IT: "იტალია",
  JM: "იამაიკა",
  JP: "იაპონია",
  JO: "იორდანია",
  KZ: "ყაზახეთი",
  KE: "კენია",
  KI: "კირიბატი",
  KP: "ჩრდილოეთ კორეა",
  KR: "სამხრეთ კორეა",
  KW: "ქუვეითი",
  KG: "ყირგიზეთი",
  LA: "ლაოსი",
  LV: "ლატვია",
  LB: "ლიბანი",
  LS: "ლესოთო",
  LR: "ლიბერია",
  LY: "ლიბია",
  LI: "ლიხტენშტაინი",
  LT: "ლიეტუვა",
  LU: "ლუქსემბურგი",
  MG: "მადაგასკარი",
  MW: "მალავი",
  MY: "მალაიზია",
  MV: "მალდივები",
  ML: "მალი",
  MT: "მალტა",
  MH: "მარშალის კუნძულები",
  MR: "მავრიტანია",
  MU: "მავრიკი",
  MX: "მექსიკა",
  FM: "მიკრონეზია",
  MD: "მოლდოვა",
  MC: "მონაკო",
  MN: "მონღოლეთი",
  ME: "მონტენეგრო",
  MA: "მაროკო",
  MZ: "მოზამბიკი",
  MM: "მიანმარი (ბირმა)",
  NA: "ნამიბია",
  NR: "ნაურუ",
  NP: "ნეპალი",
  NL: "ნიდერლანდები",
  NZ: "ახალი ზელანდია",
  NI: "ნიკარაგუა",
  NE: "ნიგერი",
  NG: "ნიგერია",
  MK: "ჩრდილოეთ მაკედონია",
  NO: "ნორვეგია",
  OM: "ომანი",
  PK: "პაკისტანი",
  PW: "პალაუ",
  PS: "პალესტინის ტერიტორიები",
  PA: "პანამა",
  PG: "პაპუა-ახალი გვინეა",
  PY: "პარაგვაი",
  PE: "პერუ",
  PH: "ფილიპინები",
  PL: "პოლონეთი",
  PT: "პორტუგალია",
  QA: "კატარი",
  RO: "რუმინეთი",
  RU: "რუსეთი",
  RW: "რუანდა",
  KN: "სენტ-კიტსი და ნევისი",
  LC: "სენტ-ლუსია",
  VC: "სენტ-ვინსენტი და გრენადინები",
  WS: "სამოა",
  SM: "სან-მარინო",
  ST: "სან-ტომე და პრინსიპი",
  SA: "საუდის არაბეთი",
  SN: "სენეგალი",
  RS: "სერბეთი",
  SC: "სეიშელის კუნძულები",
  SL: "სიერა-ლეონე",
  SG: "სინგაპური",
  SK: "სლოვაკეთი",
  SI: "სლოვენია",
  SB: "სოლომონის კუნძულები",
  SO: "სომალი",
  ZA: "სამხრეთ აფრიკის რესპუბლიკა",
  SS: "სამხრეთ სუდანი",
  ES: "ესპანეთი",
  LK: "შრი-ლანკა",
  SD: "სუდანი",
  SR: "სურინამი",
  SE: "შვედეთი",
  CH: "შვეიცარია",
  SY: "სირია",
  TW: "ტაივანი",
  TJ: "ტაჯიკეთი",
  TZ: "ტანზანია",
  TH: "ტაილანდი",
  TL: "ტიმორ-ლესტე",
  TG: "ტოგო",
  TO: "ტონგა",
  TT: "ტრინიდადი და ტობაგო",
  TN: "ტუნისი",
  TR: "თურქეთი",
  TM: "თურქმენეთი",
  TV: "ტუვალუ",
  UG: "უგანდა",
  UA: "უკრაინა",
  AE: "არაბთა გაერთიანებული საამიროები",
  GB: "გაერთიანებული სამეფო",
  US: "ამერიკის შეერთებული შტატები",
  UY: "ურუგვაი",
  UZ: "უზბეკეთი",
  VU: "ვანუატუ",
  VA: "ქალაქი ვატიკანი",
  VE: "ვენესუელა",
  VN: "ვიეტნამი",
  YE: "იემენი",
  ZM: "ზამბია",
  ZW: "ზიმბაბვე",
  XK: "კოსოვო",
};

function yesNo() {
  return [label("yes", "Yes", "კი"), label("no", "No", "არა")];
}

function label(value: string, en: string, ka: string) {
  return { value, label: { en, ka } };
}

function translateEnglish(english: string, fallback = english) {
  return georgianTranslations[english] ?? fallback;
}

function localizedText(text: Record<Language, string>, language: Language) {
  return language === "en" ? text.en : translateEnglish(text.en, text.ka);
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

const visitedDestinationValues: Record<DestinationCode, string> = {
  USA: "usa",
  CANADA: "canada",
  UK: "uk",
};

function hasVisitedDestination(config: DestinationConfig, answers: Record<string, AnswerValue>) {
  const visitedCountries = Array.isArray(answers.visited_countries) ? answers.visited_countries : [];
  return visitedCountries.includes(visitedDestinationValues[config.code]);
}

function visibleQuestions(config: DestinationConfig, answers: Record<string, AnswerValue>) {
  return config.questions.filter((question) => {
    if (question.id === "destination_visa_revoked") return hasVisitedDestination(config, answers);
    if (question.id === "frequent_destination_visits") return config.code === "UK" && hasVisitedDestination(config, answers);
    if (!question.showIf) return true;
    return answers[question.showIf.questionId] === question.showIf.equals;
  });
}

function category(score: number): ScoreResult["category"] {
  if (score >= 75) return "High";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Low";
  return "Very Low";
}

function scoreTone(score: number) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
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
  {
    name: "The Journey",
    image: "/tarot-cards/journey.png",
  },
  {
    name: "The Key",
    image: "/tarot-cards/key.png",
  },
  {
    name: "The Bridge",
    image: "/tarot-cards/bridge.png",
  },
  {
    name: "The Map",
    image: "/tarot-cards/map.png",
  },
  {
    name: "The Lantern",
    image: "/tarot-cards/lantern.png",
  },
  {
    name: "The Gate",
    image: "/tarot-cards/gate.png",
  },
  {
    name: "The Anchor",
    image: "/tarot-cards/anchor.png",
  },
  {
    name: "The Letter",
    image: "/tarot-cards/letter.png",
  },
  {
    name: "The Globe",
    image: "/tarot-cards/globe.png",
  },
];

function makeTarotCards(): TarotCard[] {
  return [...tarotDeck].sort(() => Math.random() - 0.5).slice(0, 3);
}

function scoreAssessment(config: DestinationConfig, answers: Record<string, AnswerValue>): ScoreResult {
  const visitedDestination = hasVisitedDestination(config, answers);
  const matched = config.rules.filter((ruleItem) => {
    if (
      (ruleItem.questionId === "destination_visa_revoked" || ruleItem.questionId === "frequent_destination_visits")
      && !visitedDestination
    ) return false;
    return String(answers[ruleItem.questionId]) === ruleItem.answerValue;
  });
  const occupation = answers.occupation_status;
  if (occupation && occupation !== "unemployed") {
    matched.push(rule("occupation_status", String(occupation), config.code === "CANADA" ? 3 : 4, "occupation", "positive", "Work, business, study, or retirement status supports home-country stability.", "Prepare employment, business, study, or retirement documents."));
  }
  const commitments = Array.isArray(answers.home_country_commitments) ? answers.home_country_commitments : [];
  if (commitments.includes("none")) {
    matched.push(rule(
      "home_country_commitments",
      "none",
      config.code === "UK" ? -13 : -12,
      "home_ties",
      "negative",
      "No ongoing commitments were selected, which weakens evidence that you will return home after the visit.",
      "Strengthen and document other concrete reasons to return home.",
    ));
  } else {
    const positiveCommitments = commitments.filter(
      (commitment) => commitment !== "financial" && commitment !== "other_commitment",
    );
    if (positiveCommitments.length > 0) {
      const commitmentCap = config.code === "UK" ? 11 : 10;
      const commitmentAdjustment = Math.min(commitmentCap, 2 + positiveCommitments.length * 3);
      matched.push(rule(
        "home_country_commitments",
        String(positiveCommitments.length),
        commitmentAdjustment,
        "home_ties",
        "positive",
        "Your selected ongoing commitments support your intention to return home after the visit.",
        "Prepare documents for each selected commitment, such as employment, study, family, property, or business records.",
      ));
    }
    if (commitments.includes("financial")) {
      matched.push(rule(
        "home_country_commitments",
        "financial",
        -5,
        "financial_pressure",
        "negative",
        "Significant financial obligations may create pressure that weakens the stated temporary travel plan.",
        "Explain the obligation, payment plan, and why it does not create an incentive to remain abroad.",
      ));
    }
    if (commitments.includes("other_commitment")) {
      matched.push(rule(
        "home_country_commitments",
        "other_commitment",
        -3,
        "unclear_commitment",
        "negative",
        "An unspecified ongoing commitment cannot be treated as a clear home-country tie and introduces uncertainty.",
        "Describe the commitment clearly and provide evidence showing that it requires your return home.",
      ));
    }
  }
  if (answers.international_travel === "yes") {
    const count = Number(answers.countries_visited_count || 0);
    const travelBonus = Math.min(Math.floor(count / 5) * config.travelPointsPerGroup, config.travelCap);
    if (travelBonus > 0) {
      matched.push(rule("countries_visited_count", String(count), travelBonus, "travel_depth", "positive", "Multiple trips can support a stronger travel history.", "Prepare passport stamps and previous visas."));
    }
    const visitedCountries = Array.isArray(answers.visited_countries) ? answers.visited_countries : [];
    const strongVisaCountries = new Set(["usa", "canada", "uk", "ireland", "schengen", "australia", "new_zealand", "japan", "south_korea"]);
    const excludedCountries = new Set(
      config.code === "USA" ? ["usa"] : config.code === "CANADA" ? ["canada", "usa"] : ["uk"],
    );
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
      ? clamp((config.baselineScore ?? 50) + adjustment, 5, 90)
      : clamp(mapPointsToScore(adjustment), 5, 90);

  // These answers require case-specific review; a high automated score would be misleading.
  if (visitedDestination && answers.destination_visa_revoked === "yes") score = Math.min(score, 35);
  if (answers.arrested === "yes") score = Math.min(score, 45);
  if (answers.immigration_violation === "yes") score = Math.min(score, 25);
  if (answers.previous_travel_compliance === "no") score = Math.min(score, 30);

  const resultCategory = category(score);
  return {
    score,
    category: resultCategory,
    explanation:
      resultCategory === "High"
        ? "Your answers align well with the main factors officers use to assess a temporary visitor application."
        : resultCategory === "Moderate"
          ? "Your profile has credible strengths, but one or more decision factors need stronger evidence."
          : resultCategory === "Low"
            ? "Your answers show material weaknesses that could lead to refusal unless they are addressed."
            : "Your answers show critical refusal or admissibility risks that need individual expert review.",
    strengths: matched.filter((factor) => factor.direction === "positive").sort((a, b) => b.adjustment - a.adjustment),
    risks: matched.filter((factor) => factor.direction === "negative").sort((a, b) => a.adjustment - b.adjustment),
    nextSteps: Array.from(new Set(matched.map((factor) => factor.action))).slice(0, 5),
    manualReview: matched.some((factor) => factor.manualReview),
    publicId: makePublicId(),
    tarotCards: makeTarotCards(),
  };
}

function categoryLabel(value: ScoreResult["category"], language: Language) {
  if (language === "en") return value;
  const fallback = {
    High: "მაღალი",
    Moderate: "საშუალო",
    Low: "დაბალი",
    "Very Low": "ძალიან დაბალი",
  }[value];
  return translateEnglish(value, fallback);
}

function resultExplanation(value: ScoreResult["category"], language: Language) {
  const english = value === "High"
    ? "Your answers align well with the main factors officers use to assess a temporary visitor application."
    : value === "Moderate"
      ? "Your profile has credible strengths, but one or more decision factors need stronger evidence."
      : value === "Low"
        ? "Your answers show material weaknesses that could lead to refusal unless they are addressed."
        : "Your answers show critical refusal or admissibility risks that need individual expert review.";

  if (language === "en") return english;

  const fallback = value === "High"
    ? "თქვენი პასუხები კარგად შეესაბამება იმ ძირითად ფაქტორებს, რომლებსაც ოფიცერი დროებითი ვიზიტის განაცხადის შეფასებისას განიხილავს."
    : value === "Moderate"
      ? "თქვენს პროფილს აქვს დამაჯერებელი ძლიერი მხარეები, თუმცა ერთ ან რამდენიმე მნიშვნელოვან ფაქტორს უკეთესი დასაბუთება სჭირდება."
      : value === "Low"
        ? "თქვენს პასუხებში ჩანს მნიშვნელოვანი სისუსტეები, რომლებმაც მათი გამოსწორების გარეშე შესაძლოა უარი გამოიწვიოს."
        : "თქვენს პასუხებში ჩანს უარის ან ქვეყანაში დაუშვებლობის კრიტიკული რისკები, რომლებიც ექსპერტის ინდივიდუალურ შეფასებას საჭიროებს.";
  return translateEnglish(english, fallback);
}

function factorExplanation(item: Rule, language: Language) {
  if (language === "en") return item.explanation;
  const map: Record<string, string> = {
    purpose: item.direction === "positive" ? "მოგზაურობის მიზანი შეესაბამება დროებითი ვიზიტის მოთხოვნებს." : "მოგზაურობის მიზანი დამატებით და მკაფიო დასაბუთებას საჭიროებს.",
    duration: item.direction === "positive" ? "დაგეგმილი ხანგრძლივობა შეესაბამება დროებით ვიზიტს." : "დაგეგმილი ხანგრძლივობა მიზნის, ფინანსებისა და დაბრუნების უფრო ძლიერ დასაბუთებას მოითხოვს.",
    trip_plan: item.direction === "positive" ? "კონკრეტული გეგმა და თარიღები ვიზიტის სანდოობას აძლიერებს." : "ბუნდოვანი სამოგზაურო გეგმა ვიზიტის მიზანს ასუსტებს.",
    funding_source: "საკუთარი, დადასტურებული სახსრები ფინანსურ დამოუკიდებლობას აჩვენებს.",
    travel: item.direction === "positive" ? "საერთაშორისო მოგზაურობის ისტორია აძლიერებს მოგზაურის პროფილს." : "საერთაშორისო მოგზაურობის გამოცდილების არქონა პროფილის ზომიერი სისუსტეა.",
    travel_compliance: item.direction === "positive" ? "წინა მოგზაურობების პირობების დაცვა თქვენს სანდოობას აძლიერებს." : "წინა საიმიგრაციო პირობების დარღვევა კრიტიკული რისკ-ფაქტორია.",
    travel_depth: "რამდენიმე ქვეყანაში მოგზაურობა დადებითად აჩვენებს თქვენს სამოგზაურო გამოცდილებას.",
    screened_travel: "ძლიერი სავიზო ან სასაზღვრო კონტროლის მქონე ქვეყნებში მოგზაურობა დამატებით აძლიერებს თქვენს სანდოობას.",
    prior_visa: "ადრე მიღებული ვიზა დადებითი ფაქტორია.",
    prior_refusal: "წინა უარი ამცირებს შეფასებას და საჭიროებს ახსნას.",
    refusal_change: item.direction === "positive" ? "უარის შემდეგ გარემოებების მნიშვნელოვანი გაუმჯობესება დადებითი ფაქტორია." : "მნიშვნელოვანი ცვლილების გარეშე ხელახალი განაცხადი იმავე რისკებს ინარჩუნებს.",
    revoked: "გაუქმებული ვიზა მნიშვნელოვანი რისკ-ფაქტორია.",
    immigration_violation: "ვიზის ვადის დარღვევა, დეპორტაცია ან ქვეყნიდან გაძევება მნიშვნელოვანი რისკ-ფაქტორია.",
    arrest: "დაკავების ისტორია შეიძლება რთულ სავიზო კითხვებს ქმნიდეს.",
    occupation: item.direction === "positive" ? "დასაქმება ან სწავლა აძლიერებს სტაბილურობის მტკიცებულებას." : "ამჟამინდელი საქმიანობის არქონა ასუსტებს სტაბილურობის მტკიცებულებას.",
    status_duration: item.direction === "positive" ? "ხანგრძლივი სამსახური, ბიზნესი, სწავლა ან საპენსიო სტატუსი სტაბილურობას აჩვენებს." : "ახლად დაწყებული საქმიანობა ნაკლებად ჩამოყალიბებულ კავშირად ითვლება.",
    income: item.direction === "positive" ? "რეგულარული შემოსავალი აძლიერებს ფინანსურ სტაბილურობას." : "რეგულარული შემოსავლის არქონა ფინანსურ ნაწილს ასუსტებს.",
    funds: item.direction === "positive" ? "მოგზაურობისთვის საკმარისი თანხის დადასტურება აძლიერებს თქვენს ფინანსურ პროფილს." : "მოგზაურობის ხარჯების დაუდასტურებლობა განაცხადის მნიშვნელოვანი სისუსტეა.",
    salary: item.direction === "positive" ? "ხელფასის მითითებული დიაპაზონი მხარს უჭერს ფინანსურ სტაბილურობას." : "ხელფასის დაბალი დიაპაზონი უფრო ძლიერ ფინანსურ მტკიცებულებას მოითხოვს.",
    home_ties: item.direction === "positive" ? "სამშობლოში არსებული მუდმივი ვალდებულებები დაბრუნების განზრახვას ამყარებს." : "სამშობლოში დაბრუნების დამადასტურებელი კავშირები ამ ეტაპზე სუსტად ჩანს.",
    relatives: "დანიშნულების ქვეყანაში ახლო ნათესავების არყოლამ შეიძლება შეამციროს დარჩენის რისკის აღქმა.",
    bank: item.direction === "positive" ? "საბანკო ამონაწერები მნიშვნელოვანი ფინანსური მტკიცებულებაა." : "საბანკო ამონაწერების არქონა განაცხადს ასუსტებს.",
    immigration: "დაწყებულმა საიმიგრაციო პროცესმა შეიძლება ვიზიტორის განზრახვა გაართულოს.",
    visit_pattern: "გაერთიანებულ სამეფოში ხშირი ან ხანგრძლივი ვიზიტები შეიძლება აჩენდეს კითხვას, ხომ არ იქცა ქვეყანა თქვენს ძირითად საცხოვრებლად.",
  };
  return translateEnglish(item.explanation, map[item.factorCode] ?? item.explanation);
}

function factorAction(item: Rule, language: Language) {
  if (language === "en") return item.action;
  const map: Record<string, string> = {
    purpose: "მოამზადეთ მოგზაურობის მიზნის მოკლე ახსნა და შესაბამისი დამადასტურებელი დოკუმენტები.",
    duration: "შეუსაბამეთ მარშრუტი, ბიუჯეტი და დაბრუნების გეგმა მითითებულ თარიღებს.",
    trip_plan: "მოამზადეთ რეალისტური მარშრუტი, თარიღები, საცხოვრებელი და მოსალოდნელი ხარჯები.",
    funding_source: "მოამზადეთ საბანკო დოკუმენტები, რომლებიც აჩვენებს, რომ თანხა რეალურად ხელმისაწვდომია.",
    travel: item.direction === "positive" ? "მოამზადეთ პასპორტის შტამპები, წინა ვიზები და მოგზაურობის ისტორია." : "გააძლიერეთ ფინანსური მტკიცებულებები და სამშობლოში დაბრუნების მიზეზების დასაბუთება.",
    travel_compliance: item.direction === "positive" ? "მოამზადეთ წინა ვიზები და შესვლა-გასვლის დამადასტურებელი ჩანაწერები." : "განაცხადამდე ექსპერტთან განიხილეთ სრული საიმიგრაციო ისტორია.",
    travel_depth: "მოამზადეთ პასპორტის შტამპები და წინა ვიზების ასლები.",
    screened_travel: "მოამზადეთ წინა ვიზების ასლები, შესვლის შტამპები და მოგზაურობის თარიღები.",
    prior_visa: "მოამზადეთ ადრე მიღებული ვიზების ასლები.",
    prior_refusal: "მოამზადეთ მოკლე ახსნა, რა შეიცვალა წინა უარის შემდეგ.",
    refusal_change: "დოკუმენტურად დაადასტურეთ უარის შემდეგ მომხდარი თითოეული მნიშვნელოვანი ცვლილება.",
    revoked: "განაცხადამდე მიიღეთ ექსპერტის კონსულტაცია და მოამზადეთ სრული ინფორმაცია.",
    immigration_violation: "განაცხადამდე ექსპერტთან განიხილეთ სრული საიმიგრაციო ისტორია და მოამზადეთ შესაბამისი დოკუმენტები.",
    arrest: "მოამზადეთ სრული დოკუმენტები და მიმართეთ ექსპერტს განაცხადამდე.",
    occupation: "მოამზადეთ დასაქმების, ბიზნესის, სწავლის ან პენსიის დამადასტურებელი დოკუმენტები.",
    status_duration: "მოამზადეთ საქმიანობის ხანგრძლივობისა და შვებულების დამადასტურებელი დოკუმენტები.",
    income: "მოამზადეთ ხელფასის ცნობები და საბანკო ამონაწერები.",
    funds: "მოამზადეთ საბანკო ამონაწერები და მოგზაურობის რეალისტური ბიუჯეტი.",
    salary: "მოამზადეთ ხელფასის ცნობა, საბანკო ამონაწერები და საჭიროების შემთხვევაში სპონსორის დოკუმენტები.",
    home_ties: "მოამზადეთ სამსახურის, სწავლის, ოჯახის წევრებზე ზრუნვის ან ქონების დამადასტურებელი დოკუმენტები.",
    relatives: "მოამზადეთ დაბრუნების გეგმისა და ადგილობრივი კავშირების მტკიცებულება.",
    bank: "მოამზადეთ ბოლო თვეების საბანკო ამონაწერები.",
    immigration: "განაცხადამდე გადაამოწმეთ სტრატეგია ექსპერტთან.",
    visit_pattern: "განმარტეთ ვიზიტების სიხშირე, მიზანი, გაერთიანებული სამეფოს გარეთ გატარებული დრო და სამშობლოში არსებული მუდმივი ვალდებულებები.",
  };
  return translateEnglish(item.action, map[item.factorCode] ?? item.action);
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

  const t: Record<string, string> = language === "en"
    ? copy.en
    : Object.fromEntries(
      Object.entries(copy.en).map(([key, english]) => [
        key,
        translateEnglish(english, copy.ka[key as keyof typeof copy.ka]),
      ]),
    );
  const destinationUi: Record<DestinationCode, { flag: string; name: string; profile: string }> = {
    USA: { flag: "🇺🇸", name: t.usName, profile: t.usProfile },
    CANADA: { flag: "🇨🇦", name: t.canadaName, profile: t.canadaProfile },
    UK: { flag: "🇬🇧", name: t.ukName, profile: t.ukProfile },
  };
  const nationalityOptions = useMemo(() => {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

    return countryCodes
      .map((code) => {
        const english = code === "XK" ? "Kosovo" : (displayNames.of(code) ?? code);
        return {
          value: code,
          label: language === "ka" ? translateEnglish(english, georgianCountryNames[code] ?? english) : english,
        };
      })
      .sort((first, second) => first.label.localeCompare(second.label, language === "ka" ? "ka" : "en"));
  }, [language]);
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

  useEffect(() => {
    if (!result) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [result]);

  function chooseAnswer(questionId: string, value: AnswerValue) {
    setAnswers((current) => {
      const nextAnswers = { ...current, [questionId]: value };
      if (questionId === "international_travel" && value !== "yes") {
        delete nextAnswers.countries_visited_count;
        delete nextAnswers.visited_countries;
        delete nextAnswers.previous_travel_compliance;
        delete nextAnswers.destination_visa_revoked;
        delete nextAnswers.frequent_destination_visits;
      }
      if (questionId === "regular_monthly_income" && value !== "yes") {
        delete nextAnswers.monthly_salary_range;
      }
      if (questionId === "previous_destination_visa_result" && value !== "refused") {
        delete nextAnswers.circumstances_changed_since_refusal;
      }
      return nextAnswers;
    });
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    setAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      let nextSelected: string[];
      if (questionId === "home_country_commitments" && value === "none") {
        nextSelected = selected.includes("none") ? [] : ["none"];
      } else if (questionId === "home_country_commitments") {
        const commitments = selected.filter((item) => item !== "none");
        nextSelected = commitments.includes(value)
          ? commitments.filter((item) => item !== value)
          : [...commitments, value];
      } else {
        nextSelected = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
      }
      const nextAnswers = { ...current, [questionId]: nextSelected };
      const destinationValue = destination ? visitedDestinationValues[destination] : "";
      if (questionId === "visited_countries" && !nextSelected.includes(destinationValue)) {
        delete nextAnswers.destination_visa_revoked;
        delete nextAnswers.frequent_destination_visits;
      }
      return nextAnswers;
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
          `I completed the Test Visa assessment and want expert help.\n\nName: ${contact.name}\nDestination: ${config.label}\nEstimated approval likelihood: ${result.score}%\nAssessment ID: ${result.publicId}`,
        )
      : "";

  return (
    <main className={`lang-${language} min-h-screen overflow-hidden bg-white text-[#172119]`}>
      <section className="mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <button
            aria-label={language === "ka" ? translateEnglish("Go to home page", "მთავარ გვერდზე დაბრუნება") : "Go to home page"}
            className="brand-logo-wrap brand-logo-button"
            onClick={startOver}
            type="button"
          >
            {/* Plain img is intentional here: it reliably serves the approved logo asset in local preview and deployed static hosting. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="eConsul" className="brand-logo" height={54} src="/econsul-logo.png" width={231} />
            <span>Test Visa beta</span>
          </button>
          <div className="rounded-full border border-[#d5ded9] bg-white p-1">
            {([
              { code: "en", flag: "🇬🇧" },
              { code: "ka", flag: "🇬🇪" },
            ] as const).map(({ code, flag }) => (
              <button
                aria-label={code === "en" ? "Change language to English" : "ენის ქართულად შეცვლა"}
                aria-pressed={language === code}
                className={`inline-flex size-8 items-center justify-center rounded-full text-sm ${language === code ? "bg-[#5d9e43]" : "bg-transparent"}`}
                key={code}
                onClick={() => setLanguage(code)}
              >
                <span aria-hidden="true" className="leading-none">{flag}</span>
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
                  {language === "en" ? <>Check Your Visa <span>Chances</span></> : <>შეამოწმეთ ვიზის მიღების <span>შანსები</span></>}
                </h1>
                <p className="max-w-lg text-lg leading-8 text-[#6b6a62]">{t.subhead}</p>
              </div>
            </div>
          </aside>
          )}

          <section className={destination ? "app-panel quiz-panel" : "app-panel destination-section"}>
            {!destination && (
              <div className="flow-space">
                <div className="destination-row">
                  {(Object.keys(configs) as DestinationCode[]).map((code) => (
                    <button className="destination-card" key={code} onClick={() => startDestination(code)}>
                      <span className="flag" aria-hidden="true">{destinationUi[code].flag}</span>
                      <span>
                        <strong>{destinationUi[code].name}</strong>
                        <small>{destinationUi[code].profile}</small>
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
                <Progress current={1} language={language} total={4} />
                <h2>{t.nationality}</h2>
                <select
                  className="text-input nationality-select"
                  onChange={(event) => setNationality(event.target.value)}
                  value={nationality}
                >
                  <option value="">{t.nationalityPlaceholder}</option>
                  {nationalityOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
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
                <Progress current={Math.min(step + 2, questions.length + 1)} language={language} total={questions.length + 2} />
                <p className="eyebrow">{destination ? destinationUi[destination].name : ""} {t.assessment}</p>
                <h2>{localizedText(activeQuestion.text, language)}</h2>
                {activeQuestion.type === "single_choice" && (
                  <div className="choice-grid">
                    {activeQuestion.options?.map((option) => (
                      <button
                        className={`choice-card ${answers[activeQuestion.id] === option.value ? "selected" : ""}`}
                        key={option.value}
                        onClick={() => chooseAnswer(activeQuestion.id, option.value)}
                      >
                        <strong>{localizedText(option.label, language)}</strong>
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
                          <strong>{localizedText(option.label, language)}</strong>
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
                <Progress current={questions.length + 2} language={language} total={questions.length + 2} />
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
                  <div className="tarot-grid" aria-label={language === "en" ? "Visa tarot cards" : translateEnglish("Visa tarot cards")}>
                    {result.tarotCards.map((card) => (
                      <article className="tarot-card" key={card.name} aria-label={language === "en" ? card.name : translateEnglish(card.name)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" src={card.image} />
                      </article>
                    ))}
                  </div>
                </div>
                <h2>{t.resultTitle}</h2>
                <div className={`score-row score-${scoreTone(result.score)}`}>
                  <span>{result.score}%</span>
                  <strong>{categoryLabel(result.category, language)}</strong>
                </div>
                <p className="estimate-note">{t.estimateNote}</p>
                <p className="result-copy">{resultExplanation(result.category, language)}</p>
                {result.manualReview && <div className="warning">{t.manual}</div>}
                <FactorList title={t.strengths} items={result.strengths} empty={t.emptyStrengths} language={language} />
                <FactorList title={t.risks} items={result.risks} empty={t.emptyRisks} language={language} />
                <div>
                  <h3>{t.nextSteps}</h3>
                  <ul>
                    {(result.strengths.length || result.risks.length
                      ? Array.from(new Set([...result.risks, ...result.strengths].map((item) => factorAction(item, language)))).slice(0, 5)
                      : [language === "en"
                        ? "Prepare evidence for your purpose of travel, finances, and return plans."
                        : translateEnglish(
                          "Prepare evidence for your purpose of travel, finances, and return plans.",
                          "მოამზადეთ მოგზაურობის მიზნის, ფინანსებისა და დაბრუნების გეგმის მტკიცებულება.",
                        )]
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
            <footer className="landing-footer">© eConsul 2026</footer>
          </>
        )}
      </section>
    </main>
  );
}

function Progress({ current, language, total }: { current: number; language: Language; total: number }) {
  const englishLabel = `Step ${current} of ${total}`;
  const translatedLabel = translateEnglish("Step {current} of {total}", "ნაბიჯი {current} / {total}")
    .replace("{current}", String(current))
    .replace("{total}", String(total));
  return (
    <div className="progress" aria-label={language === "en" ? englishLabel : translatedLabel}>
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
