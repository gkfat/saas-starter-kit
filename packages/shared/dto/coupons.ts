export type CouponDiscountType = 'fixed' | 'percentage' | 'item';

export type CouponTemplateStatus = 'draft' | 'published' | 'disabled';

export type CouponTemplate = {
  id: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue?: number;
  validDays: number;
  status: CouponTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type CouponInstance = {
  id: string;
  templateId: string;
  memberId: string;
  code: string;
  issuedAt: string;
  issuedBy: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedBy?: string;
};

export type CouponInstanceState = 'usable' | 'redeemed' | 'expired';

export type CouponInstanceWithState = CouponInstance & { state: CouponInstanceState };

export type CouponInstanceDetail = CouponInstanceWithState & {
  title: string;
  description: string;
};

export type CreateCouponTemplateRequest = {
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue?: number;
  validDays: number;
  status?: CouponTemplateStatus;
};

export type UpdateCouponTemplateRequest = {
  title?: string;
  description?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  validDays?: number;
  status?: CouponTemplateStatus;
};

export type IssueCouponsRequest = {
  memberIds: string[];
};

export type RedeemCouponRequest = {
  code: string;
};

export type RedeemCouponResponse = {
  instance: CouponInstanceWithState;
};
