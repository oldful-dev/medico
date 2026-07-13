import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us | Ayuxa",
  description: "Learn about Ayuxa Gentlora Esteem LLP and our mission to provide the best elder care management.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
