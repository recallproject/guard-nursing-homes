/**
 * After Care product config.
 * Swap `affiliateUrl` / `merchant` later (CareX, Target, Walmart) without rewriting UI.
 * Facility scores do not read this file.
 *
 * Typical prices are rounded from public Vive list prices observed 2026-09-23.
 * They are approximate retail labels, not a quote or a Medicare payment amount.
 */

/** @typedef {'vive'} AfterCareMerchant */
/** @typedef {'may-cover' | 'self-pay'} MedicareStatus */

/**
 * @typedef {Object} AfterCareProduct
 * @property {string} id
 * @property {string} title
 * @property {string} bestFor
 * @property {string} whyPicked One editorial sentence. Not a clinical claim.
 * @property {string} image Local product photo path under /after-care/.
 * @property {string} imageAlt
 * @property {string} [typicalPriceLabel] Approximate retail, shown with a "Typical price" label.
 * @property {MedicareStatus} medicareStatus
 * @property {string} [coverageDetail] Extra coverage wording. Does not replace the badge.
 * @property {string} [safetyNote]
 * @property {string} affiliateUrl
 * @property {string} coverageUrl Medicare.gov page. Never an affiliate link.
 * @property {AfterCareMerchant} merchant
 */

/**
 * @typedef {Object} AfterCareNeed
 * @property {string} id
 * @property {string} label
 * @property {string[]} productIds
 */

export const AFTER_CARE_DISCLOSURE =
  'OversightReports may earn a commission from qualifying purchases. Commercial relationships never affect facility scores, rankings, or safety data.';

export const MEDICARE_COVERAGE_HELPER =
  'Coverage usually requires medical necessity, a clinician order, and a Medicare-enrolled DME supplier. Buying this retail item may not be reimbursed.';

export const MEDICARE_BADGE_LABEL = {
  'may-cover': 'Medicare may cover this type of equipment',
  'self-pay': 'Usually self-pay',
};

export const AFTER_CARE_PRIMARY_CTA = 'See price on Vive';
export const AFTER_CARE_SECONDARY_CTA = 'Check Medicare coverage';

export const AFTER_CARE_MERCHANT_LABEL = {
  vive: 'Vive Health',
};

const MEDICARE_DME = 'https://www.medicare.gov/coverage/durable-medical-equipment-dme-coverage';
const MEDICARE_COMMODE = 'https://www.medicare.gov/coverage/commode-chairs';
const MEDICARE_WALKERS = 'https://www.medicare.gov/coverage/walkers';

/** @param {string} slug */
function vive(slug) {
  return `https://www.vivehealth.com/products/${slug}?aff=745`;
}

/** @type {AfterCareProduct[]} */
export const AFTER_CARE_PRODUCTS = [
  {
    id: 'shower-chair',
    title: 'Shower Chair',
    bestFor: 'Sitting while bathing when standing in the shower is hard.',
    whyPicked: 'A stable seat is the simplest way to bathe without standing the whole time.',
    image: '/after-care/shower-chair.jpg',
    imageAlt: 'Vive shower chair with a backrest, armrests, and drainage holes in the seat',
    typicalPriceLabel: 'about $70',
    medicareStatus: 'self-pay',
    affiliateUrl: vive('shower-chair'),
    coverageUrl: MEDICARE_DME,
    merchant: 'vive',
  },
  {
    id: 'tub-transfer-bench',
    title: 'Tub Transfer Bench',
    bestFor: 'Moving from outside the tub onto a seat without stepping over the side.',
    whyPicked: 'The seat spans the tub wall, so the move happens while sitting instead of stepping over the side.',
    image: '/after-care/tub-transfer-bench.jpg',
    imageAlt: 'Vive tub transfer bench with a backrest and adjustable legs',
    typicalPriceLabel: 'about $110',
    medicareStatus: 'self-pay',
    affiliateUrl: vive('tub-transfer-bench'),
    coverageUrl: MEDICARE_DME,
    merchant: 'vive',
  },
  {
    id: 'bedside-commode',
    title: 'Folding Bedside Commode',
    bestFor: 'A toilet next to the bed when the bathroom is too far.',
    whyPicked: 'It puts a toilet within reach of the bed, which is the setup most families need first.',
    image: '/after-care/bedside-commode.jpg',
    imageAlt: 'Vive folding bedside commode with a bucket, lid, and armrests',
    typicalPriceLabel: 'about $75',
    medicareStatus: 'may-cover',
    affiliateUrl: vive('commode'),
    coverageUrl: MEDICARE_COMMODE,
    merchant: 'vive',
  },
  {
    id: 'core-3-in-1',
    title: 'Core 3-in-1 Shower/Commode/Transport',
    bestFor: 'One chair used for showering, toileting, or moving between rooms.',
    whyPicked: 'One chair covers showering, toileting, and short moves between rooms.',
    image: '/after-care/core-3-in-1.jpg',
    imageAlt: 'Vive 3-in-1 shower, commode, and transport chair with large rear wheels',
    typicalPriceLabel: 'about $130',
    medicareStatus: 'self-pay',
    coverageDetail: 'Often self-pay. Whether Medicare pays can vary by the type of equipment.',
    affiliateUrl: vive('core-shower-commode-transport-wheelchair'),
    coverageUrl: MEDICARE_DME,
    merchant: 'vive',
  },
  {
    id: 'lightweight-rollator',
    title: 'Lightweight Rollator',
    bestFor: 'Walking farther, with a seat for rest breaks.',
    whyPicked: 'A seat and brakes make a longer walk possible without switching to a wheelchair.',
    image: '/after-care/lightweight-rollator.jpg',
    imageAlt: 'Vive lightweight rollator walker with a seat, backrest, and hand brakes',
    typicalPriceLabel: 'about $100',
    medicareStatus: 'may-cover',
    affiliateUrl: vive('lightweight-rollator'),
    coverageUrl: MEDICARE_WALKERS,
    merchant: 'vive',
  },
  {
    id: 'wheelchair-rollator',
    title: 'Wheelchair Rollator Combo',
    bestFor: 'Longer distances when someone needs to walk, sit, and roll in the same outing.',
    whyPicked: 'When walking tires out mid-outing, the same frame lets someone sit and be pushed.',
    image: '/after-care/wheelchair-rollator.jpg',
    imageAlt: 'Vive wheelchair rollator combo with a seat, footrests, and push handles',
    typicalPriceLabel: 'about $200',
    medicareStatus: 'may-cover',
    affiliateUrl: vive('rollator-walker-with-seat'),
    coverageUrl: MEDICARE_WALKERS,
    merchant: 'vive',
  },
  {
    id: 'gait-belt',
    title: 'Gait/Transfer Belt',
    bestFor: 'A caregiver-assisted transfer after someone has been shown how to use a belt.',
    whyPicked: 'A belt gives a caregiver a defined place to hold during a transfer they have already been shown.',
    image: '/after-care/gait-belt.jpg',
    imageAlt: 'Vive gait transfer belt with a quick-release buckle',
    typicalPriceLabel: 'about $15',
    medicareStatus: 'self-pay',
    safetyNote:
      "Transfer belts aren't for every person or every transfer. Follow physical therapy, occupational therapy, or caregiver training before using one.",
    affiliateUrl: vive('gait-belt'),
    coverageUrl: MEDICARE_DME,
    merchant: 'vive',
  },
  {
    id: 'gel-cushion',
    title: 'Wheelchair Gel Cushion',
    bestFor: 'Comfort and positioning during long periods of sitting in a wheelchair.',
    whyPicked: 'A simple add-on for comfort during long hours already spent in a wheelchair.',
    image: '/after-care/gel-cushion.jpg',
    imageAlt: 'Vive wheelchair gel seat cushion with a contoured fabric cover',
    typicalPriceLabel: 'about $40–$50',
    medicareStatus: 'self-pay',
    coverageDetail: 'Described here for comfort and positioning only — not as prevention or treatment of pressure injuries.',
    affiliateUrl: vive('wheelchair-cushions-gel'),
    coverageUrl: MEDICARE_DME,
    merchant: 'vive',
  },
];

/**
 * First id in `productIds` is the Start here pick for that need.
 * @type {AfterCareNeed[]}
 */
export const AFTER_CARE_NEEDS = [
  {
    id: 'shower',
    label: 'Getting in and out of the shower',
    productIds: ['shower-chair', 'tub-transfer-bench'],
  },
  {
    id: 'toilet',
    label: 'Getting to the toilet',
    productIds: ['bedside-commode', 'core-3-in-1'],
  },
  {
    id: 'walking',
    label: 'Walking longer distances',
    productIds: ['lightweight-rollator', 'wheelchair-rollator'],
  },
  {
    id: 'transfer',
    label: 'Needs help transferring',
    productIds: ['gait-belt'],
  },
  {
    id: 'wheelchair-sitting',
    label: 'Sits in a wheelchair much of the day',
    productIds: ['gel-cushion'],
  },
];

const productsById = new Map(AFTER_CARE_PRODUCTS.map((product) => [product.id, product]));

/** @param {string} needId */
export function isAfterCareNeedId(needId) {
  return AFTER_CARE_NEEDS.some((need) => need.id === needId);
}

/** @param {string} needId */
export function getAfterCareNeed(needId) {
  return AFTER_CARE_NEEDS.find((need) => need.id === needId) || null;
}

/** @param {string} needId */
export function productsForNeed(needId) {
  const need = getAfterCareNeed(needId);
  if (!need) return [];
  return need.productIds.map((id) => productsById.get(id)).filter(Boolean);
}
