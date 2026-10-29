import { z } from "zod";

export const onboardingCommand = z.object({
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  adminEmail: z.string().email(),
  accountEmail: z.string().email()
});

export type OnboardingCommand = z.infer<typeof onboardingCommand>;

export function decideOnboarding(input: unknown) {
  const command = onboardingCommand.parse(input);
  return {
    command,
    state: "pending_review" as const,
    accountState: "invited" as const,
    fields: {
      tenant_id: command.tenantId,
      tenant_name: command.tenantName,
      admin_email: command.adminEmail,
      account_email: command.accountEmail,
      lifecycle_state: "pending_review"
    }
  };
}
