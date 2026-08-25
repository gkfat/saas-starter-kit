export const AnalyticsEvent = {
  BookingCtaClick: 'booking_cta_click',
  BookingSubmit: 'booking_submit',
  BookingCancel: 'booking_cancel',
  RegisterSubmit: 'register_submit',
  BindSubmit: 'bind_submit',
  AdminLoginClick: 'admin_login_click',
  AdminLogoutClick: 'admin_logout_click',
  BookingReviewSubmit: 'booking_review_submit',
  CouponIssueClick: 'coupon_issue_click',
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsEventParams = Record<string, string | number | boolean>;
