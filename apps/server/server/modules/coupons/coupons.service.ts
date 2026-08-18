import { randomUUID, randomInt } from 'node:crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { FeatureFlag } from '@saas-starter-kit/shared';
import {
  createInstances,
  createTemplate,
  getInstanceById,
  getTemplateById,
  listInstancesByMember,
  listInstancesByTemplate,
  listTemplates as listTemplatesFromRepo,
  redeemInstanceByCodeTransaction,
  updateTemplate as updateTemplateInRepo,
} from './coupons.repo';
import {
  CreateCouponTemplateSchema,
  IssueCouponsSchema,
  RedeemCouponSchema,
  UpdateCouponTemplateSchema,
} from './coupons.schema';
import type {
  CouponInstance,
  CouponInstanceDetail,
  CouponInstanceWithState,
  CouponTemplate,
} from './coupons.types';

dayjs.extend(utc);

const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to reduce misreads
const CODE_LENGTH = 8;

function isCouponEnabled(): boolean {
  return useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon];
}

export function requireCouponEnabled(): void {
  if (!isCouponEnabled()) {
    throw Object.assign(new Error('Coupon module is disabled'), { code: 'coupon-disabled' });
  }
}

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[randomInt(CODE_CHARSET.length)];
  }
  return code;
}

function deriveState(instance: CouponInstance): CouponInstanceWithState['state'] {
  if (instance.redeemedAt) return 'redeemed';
  if (new Date(instance.expiresAt).getTime() < Date.now()) return 'expired';
  return 'usable';
}

function withState(instance: CouponInstance): CouponInstanceWithState {
  return { ...instance, state: deriveState(instance) };
}

export async function listCouponTemplates(): Promise<CouponTemplate[]> {
  requireCouponEnabled();
  return listTemplatesFromRepo();
}

export async function createCouponTemplate(input: {
  title: string;
  description: string;
  discountType: 'fixed' | 'percentage' | 'item';
  discountValue?: number;
  validDays: number;
  status?: 'draft' | 'published' | 'disabled';
}): Promise<CouponTemplate> {
  requireCouponEnabled();
  const parsed = CreateCouponTemplateSchema.parse(input);
  const now = new Date().toISOString();
  const template: CouponTemplate = {
    id: randomUUID(),
    title: parsed.title,
    description: parsed.description,
    discountType: parsed.discountType,
    discountValue: parsed.discountValue,
    validDays: parsed.validDays,
    status: parsed.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
  };
  await createTemplate(template);
  return template;
}

export async function updateCouponTemplate(
  id: string,
  input: {
    title?: string;
    description?: string;
    discountType?: 'fixed' | 'percentage' | 'item';
    discountValue?: number;
    validDays?: number;
    status?: 'draft' | 'published' | 'disabled';
  },
): Promise<CouponTemplate> {
  requireCouponEnabled();
  const patch = UpdateCouponTemplateSchema.parse(input);
  const existing = await getTemplateById(id);
  if (!existing) {
    throw Object.assign(new Error(`coupon template ${id} not found`), {
      code: 'coupon-template-not-found',
    });
  }

  const updatedAt = new Date().toISOString();
  await updateTemplateInRepo(id, { ...patch, updatedAt });
  return { ...existing, ...patch, updatedAt };
}

export async function issueCoupons(
  templateId: string,
  input: { memberIds: string[] },
  issuedBy: string,
): Promise<CouponInstance[]> {
  requireCouponEnabled();
  const { memberIds } = IssueCouponsSchema.parse(input);

  const template = await getTemplateById(templateId);
  if (!template) {
    throw Object.assign(new Error(`coupon template ${templateId} not found`), {
      code: 'coupon-template-not-found',
    });
  }
  if (template.status !== 'published') {
    throw Object.assign(new Error('only published templates can be issued'), {
      code: 'coupon-template-not-publishable',
    });
  }

  const issuedAt = new Date().toISOString();
  const expiresAt = dayjs.utc(issuedAt).startOf('day').add(template.validDays, 'day').toISOString();

  const instances: CouponInstance[] = memberIds.map((memberId) => ({
    id: randomUUID(),
    templateId,
    memberId,
    code: generateCode(),
    issuedAt,
    issuedBy,
    expiresAt,
  }));

  await createInstances(instances);
  return instances;
}

export async function listCouponInstancesByTemplate(
  templateId: string,
): Promise<CouponInstanceWithState[]> {
  requireCouponEnabled();
  const instances = await listInstancesByTemplate(templateId);
  return instances.map(withState);
}

export async function listMemberCoupons(memberId: string): Promise<CouponInstanceDetail[]> {
  requireCouponEnabled();
  const instances = await listInstancesByMember(memberId);
  const templates = await listTemplatesFromRepo();
  const templatesById = new Map(templates.map((template) => [template.id, template]));
  return instances.map((instance) => ({
    ...withState(instance),
    title: templatesById.get(instance.templateId)?.title ?? '',
    description: templatesById.get(instance.templateId)?.description ?? '',
  }));
}

export async function getMemberCouponById(
  id: string,
  memberId: string,
): Promise<CouponInstanceDetail> {
  requireCouponEnabled();
  const instance = await getInstanceById(id);
  if (!instance) {
    throw Object.assign(new Error(`coupon instance ${id} not found`), {
      code: 'coupon-instance-not-found',
    });
  }
  if (instance.memberId !== memberId) {
    throw Object.assign(new Error('coupon instance does not belong to this member'), {
      code: 'coupon-instance-forbidden',
    });
  }
  const template = await getTemplateById(instance.templateId);
  return {
    ...withState(instance),
    title: template?.title ?? '',
    description: template?.description ?? '',
  };
}

export async function redeemCoupon(
  input: { code: string },
  redeemedBy: string,
): Promise<CouponInstanceWithState> {
  requireCouponEnabled();
  const { code } = RedeemCouponSchema.parse(input);

  const result = await redeemInstanceByCodeTransaction(code, redeemedBy);
  if (result.status === 'not-found') {
    throw Object.assign(new Error('coupon code not found'), { code: 'coupon-not-found' });
  }
  if (result.status === 'already-redeemed') {
    throw Object.assign(new Error('coupon already redeemed'), {
      code: 'coupon-already-redeemed',
    });
  }
  if (result.status === 'expired') {
    throw Object.assign(new Error('coupon expired'), { code: 'coupon-expired' });
  }
  return withState(result.instance);
}
