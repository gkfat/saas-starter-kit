import type { FeatureRequestDto } from './marketing.schema';

export function submitFeatureRequest(dto: FeatureRequestDto, requestId: string) {
  console.log(
    JSON.stringify({
      severity: 'INFO',
      message: 'Feature module request submitted',
      requestId,
      name: dto.name,
      business: dto.business,
      email: dto.email,
      modules: dto.modules,
    }),
  );
}
