export {
  listCouponTemplates,
  createCouponTemplate,
  updateCouponTemplate,
  issueCoupons,
  listCouponInstancesByTemplate,
  listMemberCoupons,
  getMemberCouponById,
  redeemCoupon,
} from './coupons.service';
export type {
  CouponDiscountType,
  CouponTemplate,
  CouponTemplateStatus,
  CouponInstance,
  CouponInstanceDetail,
  CouponInstanceState,
  CouponInstanceWithState,
} from './coupons.types';
