import { SignInContent } from '@/components/learn/sign-in-content';
import { getAuthoritativeLearnLegalConfig } from '@/lib/server/learn-legal-config';

export default async function SignInPage() {
  return <SignInContent legalConfig={await getAuthoritativeLearnLegalConfig()} />;
}
