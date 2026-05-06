import type {
  AdDestinationType,
  AdPlacement,
  AdStatus,
  AdTheme,
  UserRole,
} from './enums';

export interface AdCampaign {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly badge?: string | null;
  readonly description: string;
  readonly supportingText?: string | null;
  readonly sponsorName?: string | null;
  readonly imageUrl?: string | null;
  readonly ctaLabel: string;
  readonly ctaUrl: string;
  readonly destinationType: AdDestinationType;
  readonly openInNewTab: boolean;
  readonly placement: AdPlacement;
  readonly status: AdStatus;
  readonly theme: AdTheme;
  readonly targetRoles: UserRole[];
  readonly displayOrder: number;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
