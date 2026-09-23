/**
 * After Care edit — a short curated set, not a catalog.
 * Facility scores do not read this file.
 *
 * Retail prices are Vive list prices shown in the After Care edit (observed 2026-09-23).
 * They are labels, not a quote and not a Medicare payment amount.
 * Vive links use affiliate id 745. Medicare.gov links never carry an affiliate id.
 */

/** @typedef {'vive' | 'coverage'} AfterCareKind */
/** @typedef {'may-cover' | 'self-pay' | 'varies'} MedicareStatus */

/**
 * @typedef {Object} AfterCarePick
 * @property {string} id
 * @property {AfterCareKind} kind
 * @property {string} label Ribbon, e.g. "Our first pick".
 * @property {string} category
 * @property {string} title
 * @property {string} price Visible price or coverage prompt.
 * @property {string} copy Card description.
 * @property {string} why One editorial sentence revealed by "Why we chose it".
 * @property {string} fit
 * @property {string} medicareLabel
 * @property {MedicareStatus} medicareStatus
 * @property {string} image Local photo under /after-care/.
 * @property {string} imageAlt
 * @property {string} [affiliateUrl] Vive only. Includes aff=745.
 * @property {string} [coverageUrl] Medicare.gov only. Never an affiliate link.
 * @property {string} [safetyNote]
 * @property {string} [comfortNote] Non-clinical limit, e.g. cushion is not wound care.
 * @property {string} merchantLine
 */

/**
 * @typedef {Object} AfterCareNeed
 * @property {string} id
 * @property {string} label
 * @property {string} hint
 * @property {string} image
 * @property {string} imageAlt
 * @property {string} editTitle
 * @property {string} editSub
 * @property {AfterCarePick} primary
 * @property {AfterCarePick} alt
 */

export const AFTER_CARE_AFFILIATE_ID = '745';

export const AFTER_CARE_INDEPENDENCE =
  'Commercial relationships never affect facility scores, rankings, or safety data.';

export const AFTER_CARE_DISCLOSURE =
  `OversightReports may earn a commission from qualifying purchases. ${AFTER_CARE_INDEPENDENCE}`;

export const AFTER_CARE_PAGE_DISCLOSURE =
  `Affiliate disclosure: OversightReports may earn a commission from qualifying purchases made through certain product links. Product availability and retailer pricing can change. Medicare coverage depends on eligibility, medical necessity, documentation, and use of an eligible supplier; buying a retail product through an affiliate link does not mean Medicare will reimburse it. ${AFTER_CARE_INDEPENDENCE}`;

export const MEDICARE_COVERAGE_HELPER =
  'Coverage usually requires medical necessity, a clinician order, and a Medicare-enrolled DME supplier. Buying this retail item may not be reimbursed.';

export const AFTER_CARE_PRIMARY_CTA = 'View option →';
export const AFTER_CARE_WHY_CTA = 'Why we chose it';

export const AFTER_CARE_DEFAULT_NEED = 'shower';

const MEDICARE_WALKERS = 'https://www.medicare.gov/coverage/walkers';
const MEDICARE_PRESSURE = 'https://www.medicare.gov/coverage/pressure-reducing-support-surfaces';

const TRANSFER_SAFETY =
  "Transfer belts aren't for every person or every transfer. Follow physical therapy, occupational therapy, or caregiver training before using one.";

const LIFT_SAFETY =
  'Caregiver training, fit, and sling selection matter. A lift is not a substitute for a transfer plan, and the sling is sold separately.';

/** @param {string} slug */
function vive(slug) {
  return `https://www.vivehealth.com/products/${slug}?aff=${AFTER_CARE_AFFILIATE_ID}`;
}

const SHOWER_CHAIR_IMG = '/after-care/shower-chair.jpg';
const TUB_BENCH_IMG = '/after-care/tub-transfer-bench.jpg';
const ROLLATOR_IMG = '/after-care/lightweight-rollator.jpg';
const BELT_IMG = '/after-care/transfer-belt.jpg';
const LIFT_IMG = '/after-care/patient-lift.jpg';
const CUSHION_IMG = '/after-care/gel-cushion.jpg';

/** @type {AfterCarePick} */
const showerChair = {
  id: 'shower-chair',
  kind: 'vive',
  label: 'Our first pick',
  category: 'Bathing safely',
  title: 'Vive Shower Chair',
  price: '$67.99',
  copy: 'A straightforward place to start when standing through a full shower feels unsteady or tiring.',
  why: 'A seat with a back is the simplest first step when standing through a shower is the hard part.',
  fit: 'Best for standing less during showers',
  medicareLabel: 'Usually self-pay',
  medicareStatus: 'self-pay',
  image: SHOWER_CHAIR_IMG,
  imageAlt: 'Vive shower chair with a backrest, armrests, and drainage holes in the seat',
  affiliateUrl: vive('shower-chair'),
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const tubBench = {
  id: 'tub-transfer-bench',
  kind: 'vive',
  label: 'More support',
  category: 'Tub entry',
  title: 'Vive Tub Transfer Bench',
  price: '$109.99',
  copy: 'A stronger fit when stepping over the side of a tub is the part that feels difficult.',
  why: 'The seat spans the tub wall, so the move happens while sitting instead of stepping over the side.',
  fit: 'Best when tub entry is the problem',
  medicareLabel: 'Usually self-pay',
  medicareStatus: 'self-pay',
  image: TUB_BENCH_IMG,
  imageAlt: 'Vive tub transfer bench with a backrest and adjustable legs',
  affiliateUrl: vive('tub-transfer-bench'),
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const rollator = {
  id: 'lightweight-rollator',
  kind: 'vive',
  label: 'Our first pick',
  category: 'Walking support',
  title: 'Vive Lightweight Rollator',
  price: '$99.99',
  copy: 'A lightweight seated rollator for someone who can walk but benefits from support and a place to rest.',
  why: 'A seat and hand brakes cover the usual gap between a cane and a wheelchair for longer walks.',
  fit: 'Best for balance + endurance',
  medicareLabel: 'This equipment type may qualify',
  medicareStatus: 'may-cover',
  image: ROLLATOR_IMG,
  imageAlt: 'Vive lightweight rollator walker with a seat, backrest, and hand brakes',
  affiliateUrl: vive('lightweight-rollator'),
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const walkersCoverage = {
  id: 'walkers-coverage',
  kind: 'coverage',
  label: 'Before you buy',
  category: 'Medicare',
  title: 'Check coverage first',
  price: 'May save money',
  copy: 'Walkers and rollators can be covered in qualifying situations when ordered and supplied through the appropriate Medicare process.',
  why: 'Retail checkout and a Medicare-enrolled supplier are different paths. Checking coverage first can avoid paying out of pocket for equipment Medicare might supply.',
  fit: 'Worth checking before retail purchase',
  medicareLabel: 'Medicare may cover the category',
  medicareStatus: 'may-cover',
  image: ROLLATOR_IMG,
  imageAlt: 'Rollator shown beside Medicare coverage information for walkers',
  coverageUrl: MEDICARE_WALKERS,
  merchantLine: 'Coverage information',
};

/** @type {AfterCarePick} */
const transferBelt = {
  id: 'transfer-belt',
  kind: 'vive',
  label: 'Our first pick',
  category: 'Transfer support',
  title: 'Vive Transfer Belt with Leg Straps',
  price: '$32.99',
  copy: 'A more supportive belt option for caregivers who have already been shown an appropriate assisted-transfer technique.',
  why: 'Leg straps give a caregiver a defined hold during a transfer they have already been shown. The belt does not replace that instruction.',
  fit: 'Best for trained assisted transfers',
  medicareLabel: 'Usually self-pay',
  medicareStatus: 'self-pay',
  image: BELT_IMG,
  imageAlt: 'Vive transfer belt with leg straps and a buckle',
  affiliateUrl: vive('transfer-belt-loops'),
  safetyNote: TRANSFER_SAFETY,
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const transferLift = {
  id: 'transfer-lift',
  kind: 'vive',
  label: 'If more support is needed',
  category: 'Higher-assistance transfers',
  title: 'Consider a patient lift',
  price: 'From $824.99',
  copy: 'When standing transfers are not realistic, a lift may be more appropriate than trying to solve the problem with a belt alone.',
  why: 'We point to a lift here only as the next step when a belt is not enough, and we keep the sling-sold-separately limit visible.',
  fit: 'Best for higher-assistance transfers',
  medicareLabel: 'This equipment type may qualify',
  medicareStatus: 'may-cover',
  image: LIFT_IMG,
  imageAlt: 'Vive electric patient lift with a boom arm and a hanging sling bar',
  affiliateUrl: vive('electric-patient-lift'),
  safetyNote: LIFT_SAFETY,
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const patientLift = {
  id: 'patient-lift',
  kind: 'vive',
  label: 'Featured option',
  category: 'Patient lift',
  title: 'Vive Electric Patient Lift',
  price: '$824.99',
  copy: 'A motorized home transfer option designed for bed, wheelchair, and other supported transfers; sling is sold separately.',
  why: 'We feature a lift when standing transfers are not realistic, and we say plainly that training, fit, and a separate sling still matter.',
  fit: 'Best for higher-assistance transfers',
  medicareLabel: 'Patient lifts may qualify',
  medicareStatus: 'may-cover',
  image: LIFT_IMG,
  imageAlt: 'Vive electric patient lift with a boom arm and a hanging sling bar',
  affiliateUrl: vive('electric-patient-lift'),
  safetyNote: LIFT_SAFETY,
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const liftBelt = {
  id: 'lift-belt',
  kind: 'vive',
  label: 'Less equipment',
  category: 'Transfer support',
  title: 'Transfer belt',
  price: '$32.99',
  copy: 'For people who can still participate in a transfer, a properly used transfer belt may be the simpler option.',
  why: 'If the person can still take part in the move, a belt they have been shown how to use is the smaller piece of equipment.',
  fit: 'Only if appropriate for the transfer plan',
  medicareLabel: 'Usually self-pay',
  medicareStatus: 'self-pay',
  image: BELT_IMG,
  imageAlt: 'Vive transfer belt with leg straps and a buckle',
  affiliateUrl: vive('transfer-belt-loops'),
  safetyNote: TRANSFER_SAFETY,
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const gelCushion = {
  id: 'gel-cushion',
  kind: 'vive',
  label: 'Our first pick',
  category: 'Sitting comfort',
  title: 'Vive Wheelchair Gel Seat Cushion',
  price: 'From $39.99',
  copy: 'A simple consumer option for adding cushioning and support to a wheelchair or other chair.',
  why: 'We kept this as a comfort cushion for long hours in a chair, and we kept it separate from clinical support surfaces.',
  fit: 'Best for everyday comfort',
  medicareLabel: 'Usually self-pay / coverage varies',
  medicareStatus: 'varies',
  image: CUSHION_IMG,
  imageAlt: 'Vive wheelchair gel seat cushion with a contoured fabric cover',
  affiliateUrl: vive('wheelchair-cushions-gel'),
  comfortNote: 'Shown for everyday comfort and positioning, not as prevention or treatment of pressure injuries.',
  merchantLine: 'Available from Vive Health',
};

/** @type {AfterCarePick} */
const pressureCoverage = {
  id: 'pressure-coverage',
  kind: 'coverage',
  label: 'Important distinction',
  category: 'Pressure management',
  title: 'Higher-risk pressure needs',
  price: 'Ask the care team',
  copy: 'If there is a pressure injury or significant pressure risk, product selection should be guided by the clinical plan rather than a generic retail cushion.',
  why: 'A retail comfort cushion and a clinically selected support surface are different decisions.',
  fit: 'Best handled with individualized guidance',
  medicareLabel: 'Certain support surfaces may qualify',
  medicareStatus: 'may-cover',
  image: CUSHION_IMG,
  imageAlt: 'Wheelchair cushion shown beside a note that clinical pressure equipment is a separate decision',
  coverageUrl: MEDICARE_PRESSURE,
  merchantLine: 'Coverage information',
};

/**
 * Each need has one primary and one alternate. Nothing else is listed.
 * @type {AfterCareNeed[]}
 */
export const AFTER_CARE_NEEDS = [
  {
    id: 'shower',
    label: 'Bathing safely',
    hint: 'Standing less, getting in and out',
    image: SHOWER_CHAIR_IMG,
    imageAlt: 'Vive shower chair',
    editTitle: 'Our picks for safer bathing',
    editSub: 'Start with the simplest option that solves the actual problem.',
    primary: showerChair,
    alt: tubBench,
  },
  {
    id: 'walking',
    label: 'Walking with support',
    hint: 'Balance, endurance, longer distances',
    image: ROLLATOR_IMG,
    imageAlt: 'Vive rollator',
    editTitle: 'Our pick for easier everyday walking',
    editSub: 'Prioritize stability, weight, and whether a built-in seat matters.',
    primary: rollator,
    alt: walkersCoverage,
  },
  {
    id: 'transfer',
    label: 'Transfers',
    hint: 'Bed, chair, standing assistance',
    image: BELT_IMG,
    imageAlt: 'Vive transfer belt',
    editTitle: 'Our edit for assisted transfers',
    editSub: 'A belt can support a trained transfer plan; it is not a substitute for safe transfer instruction.',
    primary: transferBelt,
    alt: transferLift,
  },
  {
    id: 'lift',
    label: 'More transfer support',
    hint: 'When standing transfers are difficult',
    image: LIFT_IMG,
    imageAlt: 'Vive electric patient lift',
    editTitle: 'When standing transfers are not realistic',
    editSub: 'This is a category where caregiver training, fit, sling selection, and Medicare eligibility matter.',
    primary: patientLift,
    alt: liftBelt,
  },
  {
    id: 'sitting',
    label: 'Sitting comfortably',
    hint: 'Wheelchair comfort and support',
    image: CUSHION_IMG,
    imageAlt: 'Vive wheelchair cushion',
    editTitle: 'Our pick for everyday sitting comfort',
    editSub: 'Keep comfort products distinct from clinically prescribed pressure-management equipment.',
    primary: gelCushion,
    alt: pressureCoverage,
  },
];

/** @param {string} needId */
export function isAfterCareNeedId(needId) {
  return AFTER_CARE_NEEDS.some((need) => need.id === needId);
}

/** @param {string} needId */
export function getAfterCareNeed(needId) {
  return AFTER_CARE_NEEDS.find((need) => need.id === needId) || null;
}

/** Primary first, then the single alternate. @param {string} needId */
export function productsForNeed(needId) {
  const need = getAfterCareNeed(needId);
  if (!need) return [];
  return [need.primary, need.alt];
}

/** @returns {AfterCarePick[]} */
export function allAfterCarePicks() {
  return AFTER_CARE_NEEDS.flatMap((need) => [need.primary, need.alt]);
}
