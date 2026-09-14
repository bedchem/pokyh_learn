import { SignInContent } from '@/components/learn/sign-in-content';
import { getPublicLearnLegalConfig } from '@/lib/server/config';

export default function SignInPage() {
  return <SignInContent legalConfig={getPublicLearnLegalConfig()} />;
}
