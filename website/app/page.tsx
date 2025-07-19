import { HeroSection } from '@/components/sections/HeroSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { StatsPreview } from '@/components/sections/StatsPreview';
import { LeagueSelector } from '@/components/sections/LeagueSelector';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { CTASection } from '@/components/sections/CTASection';

export default function HomePage() {
  return (
    <div className="space-y-0">
      <HeroSection />
      <LeagueSelector />
      <FeaturesSection />
      <StatsPreview />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}