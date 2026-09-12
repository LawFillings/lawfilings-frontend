import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { DrtWrittenStatementWizard } from './pages/DrtWrittenStatementWizard';
import { ConsumerComplaintWizard } from './pages/ConsumerComplaintWizard';
import { NcltSection9Wizard } from './pages/NcltSection9Wizard';
import { DrtSaWizard } from './pages/DrtSaWizard';
import { DrtOaWizard } from './pages/DrtOaWizard';
import { MoneyRecoverySuitWizard } from './pages/MoneyRecoverySuitWizard';
import { SummarySuitWizard } from './pages/SummarySuitWizard';
import { LegalNoticeWizard } from './pages/LegalNoticeWizard';
import { ContractAgreementWizard } from './pages/ContractAgreementWizard';
import { BailApplicationWizard } from './pages/BailApplicationWizard';
import { ContestedDivorceWizard } from './pages/ContestedDivorceWizard';
import { MutualConsentDivorceWizard } from './pages/MutualConsentDivorceWizard';
import { TemporaryInjunctionWizard } from './pages/TemporaryInjunctionWizard';
import { PermanentInjunctionSuitWizard } from './pages/PermanentInjunctionSuitWizard';
import { MandatoryInjunctionSuitWizard } from './pages/MandatoryInjunctionSuitWizard';
import { SetAsideExParteDecreeWizard } from './pages/SetAsideExParteDecreeWizard';
import { CondonationOfDelayWizard } from './pages/CondonationOfDelayWizard';
import { ClaimObjectionExecutionWizard } from './pages/ClaimObjectionExecutionWizard';
import { InterpleaderSuitWizard } from './pages/InterpleaderSuitWizard';
import { MactClaimPetitionWizard } from './pages/MactClaimPetitionWizard';
import { LandAcquisitionReferenceWizard } from './pages/LandAcquisitionReferenceWizard';
import { RedemptionOfMortgageSuitWizard } from './pages/RedemptionOfMortgageSuitWizard';
import { AttachmentBeforeJudgmentWizard } from './pages/AttachmentBeforeJudgmentWizard';
import { CancellationOfDocumentSuitWizard } from './pages/CancellationOfDocumentSuitWizard';
import { PossessionResistanceApplicationWizard } from './pages/PossessionResistanceApplicationWizard';
import { ForeclosureMortgageSuitWizard } from './pages/ForeclosureMortgageSuitWizard';
import { RestorationSuitDefaultWizard } from './pages/RestorationSuitDefaultWizard';
import { DeclarationSuitWizard } from './pages/DeclarationSuitWizard';
import { SpecificPerformanceSuitWizard } from './pages/SpecificPerformanceSuitWizard';
import { PartitionSuitWizard } from './pages/PartitionSuitWizard';
import { PossessionSuitWizard } from './pages/PossessionSuitWizard';
import { RestitutionConjugalRightsWizard } from './pages/RestitutionConjugalRightsWizard';
import { JudicialSeparationWizard } from './pages/JudicialSeparationWizard';
import { MaintenanceApplicationWizard } from './pages/MaintenanceApplicationWizard';
import { DomesticViolenceApplicationWizard } from './pages/DomesticViolenceApplicationWizard';
import { GuardianshipCustodyPetitionWizard } from './pages/GuardianshipCustodyPetitionWizard';
import { PrivateCriminalComplaintWizard } from './pages/PrivateCriminalComplaintWizard';
import { QuashingPetitionWizard } from './pages/QuashingPetitionWizard';
import { CriminalRevisionPetitionWizard } from './pages/CriminalRevisionPetitionWizard';
import { CriminalAppealWizard } from './pages/CriminalAppealWizard';
import { ArbitrationS9Wizard } from './pages/ArbitrationS9Wizard';
import { ArbitrationS11Wizard } from './pages/ArbitrationS11Wizard';
import { ArbitrationS34Wizard } from './pages/ArbitrationS34Wizard';
import { SuccessionCertificateWizard } from './pages/SuccessionCertificateWizard';
import { ProbateWizard } from './pages/ProbateWizard';
import { LettersOfAdministrationWizard } from './pages/LettersOfAdministrationWizard';
import { RentControlEvictionWizard } from './pages/RentControlEvictionWizard';
import { WritPetitionWizard } from './pages/WritPetitionWizard';
import { SlpCivilWizard } from './pages/SlpCivilWizard';
import { MediationApplicationWizard } from './pages/MediationApplicationWizard';
import { NIActComplaintWizard } from './pages/NIActComplaintWizard';
import { AppealWizard } from './pages/AppealWizard';
import { ExecutionWizard } from './pages/ExecutionWizard';
import { GenericCaseWizard } from './pages/GenericCaseWizard';
import { LawLibrary, type ActCategory } from './pages/LawLibrary';
import { CaseLawSearch } from './pages/CaseLawSearch';
import { CourtFeeCalculatorPage } from './pages/CourtFeeCalculatorPage';
import { TranslateDocumentPage } from './pages/TranslateDocumentPage';
import { CauseListBasicPage } from './pages/CauseListBasicPage';
import { CauseListProPage } from './pages/CauseListProPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { GrievanceOfficerPage } from './pages/GrievanceOfficerPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { MyCasesPage } from './pages/MyCasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { PricingPage } from './pages/PricingPage';
import { CheckoutScreen, type CheckoutIntent } from './pages/CheckoutScreen';
import { BillingPage } from './pages/BillingPage';
import { AdminGapsPage } from './pages/AdminGapsPage';
import { AppSidebar } from './components/AppSidebar';
import { TopMasthead } from './components/TopMasthead';
import { TopNav } from './components/TopNav';
import { DictationControl } from './components/DictationControl';
import { BrandWatermark } from './components/BrandWatermark';
import { SettingsProvider } from './lib/settings';
import { AuthProvider, useAuth } from './lib/auth';
import { LanguageProvider } from './lib/language';
import type { CaseType, AppealGroup } from './types';
import './App.css';

type Screen =
  | { kind: 'landing' }
  | { kind: 'home' }
  | {
      kind: 'caseType';
      caseType: CaseType;
      /** Set when resuming an existing saved draft rather than starting a new one — threaded
       * through to the wizard so it hydrates its fields from initialContent instead of starting
       * blank, and updates the same case/draft on save instead of creating a new one. */
      caseId?: string;
      draftId?: string;
      initialContent?: unknown;
    }
  | { kind: 'appealGroup'; group: AppealGroup }
  | { kind: 'lawLibrary'; category?: ActCategory }
  | { kind: 'caseLawSearch' }
  | { kind: 'courtFeeCalculator' }
  | { kind: 'translateDocument' }
  | { kind: 'causeListBasic' }
  | { kind: 'causeListPro' }
  | { kind: 'about' }
  | { kind: 'contact' }
  | { kind: 'privacyPolicy' }
  | { kind: 'termsOfService' }
  | { kind: 'grievanceOfficer' }
  | { kind: 'settings' }
  | { kind: 'login' }
  | { kind: 'signup' }
  | { kind: 'myCases' }
  | { kind: 'caseDetail'; caseId: string }
  | { kind: 'pricing' }
  | { kind: 'checkout'; intent: CheckoutIntent }
  | { kind: 'billing' }
  | { kind: 'adminGaps' };

export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppScreens />
        </AuthProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}

function AppScreens() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Screen[]>([{ kind: 'landing' }]);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const screen = history[history.length - 1];

  const navigate = (next: Screen) => setHistory((h) => [...h, next]);
  const onBack = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));

  // Browsing which filings are available is open to everyone; actually opening one to draft
  // requires an account, since drafts belong to a user. Unauthenticated clicks are redirected
  // to login and the intended destination is resumed once they're signed in.
  const requireAuth = (destination: Screen) => {
    if (user) {
      navigate(destination);
    } else {
      setPendingScreen(destination);
      navigate({ kind: 'login' });
    }
  };

  // Shared across the persistent sidebar (rendered on every screen) and the landing page's own
  // hero/body content, which still needs a couple of these directly.
  const goHome = () => navigate({ kind: 'landing' });
  const startFilingNav = () => navigate({ kind: 'home' });
  const openLawLibraryNav = () => navigate({ kind: 'lawLibrary' });
  const openLawLibraryCategoryNav = (category: ActCategory) => navigate({ kind: 'lawLibrary', category });
  const openCaseLawSearchNav = () => navigate({ kind: 'caseLawSearch' });
  const openCourtFeeCalculatorNav = () => navigate({ kind: 'courtFeeCalculator' });
  const openTranslateDocumentNav = () => navigate({ kind: 'translateDocument' });
  const openCauseListBasicNav = () => navigate({ kind: 'causeListBasic' });
  const openCauseListProNav = () => navigate({ kind: 'causeListPro' });
  const openAboutNav = () => navigate({ kind: 'about' });
  const openContactNav = () => navigate({ kind: 'contact' });
  const openPrivacyPolicyNav = () => navigate({ kind: 'privacyPolicy' });
  const openTermsOfServiceNav = () => navigate({ kind: 'termsOfService' });
  const openGrievanceOfficerNav = () => navigate({ kind: 'grievanceOfficer' });
  const openSettingsNav = () => navigate({ kind: 'settings' });
  const openLoginNav = () => navigate({ kind: 'login' });
  const openMyCasesNav = () => navigate({ kind: 'myCases' });
  const openPricingNav = () => navigate({ kind: 'pricing' });
  const openBillingNav = () => navigate({ kind: 'billing' });
  const openAdminGapsNav = () => navigate({ kind: 'adminGaps' });

  function renderScreen() {
    if (screen.kind === 'landing') {
      return (
        <LandingPage
          onStartFiling={startFilingNav}
          onOpenLawLibrary={openLawLibraryNav}
          onOpenAbout={openAboutNav}
          onOpenContact={openContactNav}
          onOpenPrivacyPolicy={openPrivacyPolicyNav}
          onOpenTermsOfService={openTermsOfServiceNav}
          onOpenGrievanceOfficer={openGrievanceOfficerNav}
        />
      );
    }

    if (screen.kind === 'home') {
      return (
        <Home
          onBack={onBack}
          onSelectCaseType={(ct) => requireAuth({ kind: 'caseType', caseType: ct })}
          onSelectAppealGroup={(g) => requireAuth({ kind: 'appealGroup', group: g })}
          onOpenLawLibrary={openLawLibraryNav}
          onOpenSettings={openSettingsNav}
        />
      );
    }

    if (screen.kind === 'settings') return <SettingsPage onBack={onBack} />;
    if (screen.kind === 'lawLibrary') {
      // Keyed on category so that clicking a different category sub-link in AppSidebar while
      // already on this page forces a fresh mount — otherwise LawLibrary's own category state
      // (initialized once from this prop) would never pick up the new value.
      return (
        <LawLibrary
          onBack={onBack}
          initialCategory={screen.category}
          key={screen.category ?? 'default'}
          onOpenLogin={openLoginNav}
          onOpenTranslateDocument={openTranslateDocumentNav}
        />
      );
    }
    if (screen.kind === 'caseLawSearch') {
      return <CaseLawSearch onBack={onBack} onOpenLogin={openLoginNav} onOpenTranslateDocument={openTranslateDocumentNav} />;
    }
    if (screen.kind === 'courtFeeCalculator') {
      return <CourtFeeCalculatorPage onBack={onBack} />;
    }
    if (screen.kind === 'translateDocument') {
      return <TranslateDocumentPage onBack={onBack} onOpenLogin={openLoginNav} onOpenPricing={openPricingNav} />;
    }
    if (screen.kind === 'causeListBasic') {
      return <CauseListBasicPage onBack={onBack} onOpenLogin={openLoginNav} onOpenPricing={openPricingNav} />;
    }
    if (screen.kind === 'causeListPro') {
      return <CauseListProPage onBack={onBack} onOpenLogin={openLoginNav} onOpenPricing={openPricingNav} />;
    }
    if (screen.kind === 'about') return <AboutPage onBack={onBack} onStartFiling={startFilingNav} />;
    if (screen.kind === 'contact') return <ContactPage onBack={onBack} />;
    if (screen.kind === 'privacyPolicy') return <PrivacyPolicyPage onBack={onBack} />;
    if (screen.kind === 'termsOfService') return <TermsOfServicePage onBack={onBack} />;
    if (screen.kind === 'grievanceOfficer') return <GrievanceOfficerPage onBack={onBack} />;
    if (screen.kind === 'login') {
      return (
        <LoginPage
          onBack={() => {
            setPendingScreen(null);
            onBack();
          }}
          onLoggedIn={() => {
            const destination = pendingScreen;
            setPendingScreen(null);
            navigate(destination ?? { kind: 'myCases' });
          }}
          onSwitchToSignup={() => navigate({ kind: 'signup' })}
        />
      );
    }
    if (screen.kind === 'signup') {
      return (
        <SignupPage
          onBack={() => {
            setPendingScreen(null);
            onBack();
          }}
          onSignedUp={(role) => {
            const destination = pendingScreen;
            setPendingScreen(null);
            // A brand-new advocate still goes through subscription checkout first — the trial
            // mandate has to be set up regardless of what they were trying to do when they signed up.
            navigate(role === 'advocate' ? { kind: 'pricing' } : destination ?? { kind: 'myCases' });
          }}
          onSwitchToLogin={openLoginNav}
        />
      );
    }
    if (screen.kind === 'myCases') {
      return (
        <MyCasesPage
          onBack={onBack}
          onOpenCase={(caseId) => navigate({ kind: 'caseDetail', caseId })}
          onOpenLogin={openLoginNav}
        />
      );
    }
    if (screen.kind === 'caseDetail') {
      return (
        <CaseDetailPage
          caseId={screen.caseId}
          onBack={onBack}
          onOpenDraft={(draft, ct) => {
            navigate({ kind: 'caseType', caseType: ct, caseId: draft.caseId, draftId: draft.id, initialContent: draft.content });
          }}
        />
      );
    }
    if (screen.kind === 'appealGroup') {
      return (
        <AppealWizard
          group={screen.group}
          onBack={onBack}
          onOpenPricing={openPricingNav}
        />
      );
    }
    if (screen.kind === 'pricing') {
      return (
        <PricingPage
          onBack={onBack}
          onSelectPlan={(plan, tier) => navigate({ kind: 'checkout', intent: { type: 'subscription', plan, tier } })}
          onOpenLogin={openLoginNav}
        />
      );
    }
    if (screen.kind === 'checkout') {
      return (
        <CheckoutScreen
          intent={screen.intent}
          onBack={onBack}
          onSuccess={() => navigate(user?.role === 'advocate' ? { kind: 'myCases' } : { kind: 'billing' })}
        />
      );
    }
    if (screen.kind === 'billing') {
      return <BillingPage onBack={onBack} onOpenPricing={openPricingNav} onOpenLogin={openLoginNav} />;
    }
    if (screen.kind === 'adminGaps') {
      return <AdminGapsPage onBack={onBack} />;
    }

    const ct = screen.caseType;
    const resumeProps = { caseId: screen.caseId, draftId: screen.draftId, initialContent: screen.initialContent };

    if (ct.id === 'ct-drt-ws') {
      return (
        <DrtWrittenStatementWizard
          onBack={onBack}
          onOpenCaseLawSearch={openCaseLawSearchNav}
          onOpenPricing={openPricingNav}
          {...resumeProps}
        />
      );
    }
    if (ct.id === 'ct-cc-complaint') {
      return (
        <ConsumerComplaintWizard
          onBack={onBack}
          onOpenCaseLawSearch={openCaseLawSearchNav}
          onOpenPricing={openPricingNav}
          {...resumeProps}
        />
      );
    }
    if (ct.id === 'ct-nclt-s9') {
      return (
        <NcltSection9Wizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-drt-sa') {
      return <DrtSaWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />;
    }
    if (ct.id === 'ct-drt-oa') {
      return <DrtOaWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />;
    }

    if (ct.id === 'ct-dc-money-recovery') {
      return (
        <MoneyRecoverySuitWizard
          onBack={onBack}
          onOpenPricing={openPricingNav}
          onOpenLawLibrary={openLawLibraryNav}
          {...resumeProps}
        />
      );
    }
    if (ct.id === 'ct-dc-summary-suit') {
      return (
        <SummarySuitWizard
          onBack={onBack}
          onOpenPricing={openPricingNav}
          onOpenLawLibrary={openLawLibraryNav}
          {...resumeProps}
        />
      );
    }
    if (ct.id === 'ct-legal-notice') {
      return <LegalNoticeWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />;
    }
    if (ct.id === 'ct-contract-agreement') {
      return (
        <ContractAgreementWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-bail-application') {
      return (
        <BailApplicationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-mediation-application') {
      return (
        <MediationApplicationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-ni-act-complaint') {
      return (
        <NIActComplaintWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-divorce-contested') {
      return (
        <ContestedDivorceWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-divorce-mutual-consent') {
      return (
        <MutualConsentDivorceWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-injunction-temporary') {
      return (
        <TemporaryInjunctionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-permanent-injunction') {
      return (
        <PermanentInjunctionSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-mandatory-injunction') {
      return (
        <MandatoryInjunctionSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-application-set-aside-exparte-decree') {
      return (
        <SetAsideExParteDecreeWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-application-condonation-of-delay') {
      return (
        <CondonationOfDelayWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-claim-objection-execution') {
      return (
        <ClaimObjectionExecutionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-interpleader-suit') {
      return (
        <InterpleaderSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-mact-claim-petition') {
      return (
        <MactClaimPetitionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-land-acquisition-reference') {
      return (
        <LandAcquisitionReferenceWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-redemption-mortgage') {
      return (
        <RedemptionOfMortgageSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-attachment-before-judgment') {
      return (
        <AttachmentBeforeJudgmentWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-cancellation-of-document') {
      return (
        <CancellationOfDocumentSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-application-possession-resistance') {
      return (
        <PossessionResistanceApplicationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-foreclosure-mortgage') {
      return (
        <ForeclosureMortgageSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-application-restoration-suit-default') {
      return (
        <RestorationSuitDefaultWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-declaration') {
      return (
        <DeclarationSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-specific-performance') {
      return (
        <SpecificPerformanceSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-partition') {
      return (
        <PartitionSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-suit-possession') {
      return (
        <PossessionSuitWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-restitution-conjugal-rights') {
      return (
        <RestitutionConjugalRightsWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-judicial-separation') {
      return (
        <JudicialSeparationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-maintenance-application') {
      return (
        <MaintenanceApplicationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-domestic-violence-application') {
      return (
        <DomesticViolenceApplicationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-guardianship-custody-petition') {
      return (
        <GuardianshipCustodyPetitionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-private-criminal-complaint') {
      return (
        <PrivateCriminalComplaintWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-quashing-petition') {
      return (
        <QuashingPetitionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-criminal-revision-petition') {
      return (
        <CriminalRevisionPetitionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-criminal-appeal') {
      return (
        <CriminalAppealWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-arbitration-s9-interim-relief') {
      return (
        <ArbitrationS9Wizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-arbitration-s11-appointment') {
      return (
        <ArbitrationS11Wizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-arbitration-s34-setting-aside') {
      return (
        <ArbitrationS34Wizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-succession-certificate') {
      return (
        <SuccessionCertificateWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-probate') {
      return (
        <ProbateWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-letters-of-administration') {
      return (
        <LettersOfAdministrationWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-rent-control-eviction') {
      return (
        <RentControlEvictionWizard
          onBack={onBack}
          onOpenPricing={openPricingNav}
          onOpenLawLibrary={openLawLibraryNav}
          {...resumeProps}
        />
      );
    }
    if (ct.id === 'ct-writ-petition-226') {
      return (
        <WritPetitionWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }
    if (ct.id === 'ct-slp-civil') {
      return (
        <SlpCivilWizard onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />
      );
    }

    if (ct.filingCategory === 'execution') {
      return (
        <ExecutionWizard
          caseType={ct}
          onBack={onBack}
          onOpenPricing={openPricingNav}
          {...resumeProps}
        />
      );
    }

    return <GenericCaseWizard caseType={ct} onBack={onBack} onOpenPricing={openPricingNav} {...resumeProps} />;
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-root">
      <BrandWatermark />
      <TopMasthead
        onGoHome={() => {
          goHome();
          closeMobileMenu();
        }}
        onOpenCaseLawSearch={() => {
          openCaseLawSearchNav();
          closeMobileMenu();
        }}
        onOpenLogin={() => {
          openLoginNav();
          closeMobileMenu();
        }}
        onOpenBilling={() => {
          openBillingNav();
          closeMobileMenu();
        }}
        onOpenSettings={() => {
          openSettingsNav();
          closeMobileMenu();
        }}
        onOpenAdminGaps={() => {
          openAdminGapsNav();
          closeMobileMenu();
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen((open) => !open)}
      />
      <TopNav
        activeKind={screen.kind}
        onGoHome={goHome}
        onOpenLawLibrary={openLawLibraryNav}
        onOpenLawLibraryCategory={openLawLibraryCategoryNav}
        onOpenCaseLawSearch={openCaseLawSearchNav}
        onOpenCourtFeeCalculator={openCourtFeeCalculatorNav}
        onOpenTranslateDocument={openTranslateDocumentNav}
        onOpenCauseListBasic={openCauseListBasicNav}
        onOpenCauseListPro={openCauseListProNav}
        onOpenPricing={openPricingNav}
        onOpenAbout={openAboutNav}
        onOpenContact={openContactNav}
        onOpenMyCases={openMyCasesNav}
        onStartFiling={startFilingNav}
      />
      <div className="app-shell">
        <AppSidebar
          isLandingPage={screen.kind === 'landing'}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={closeMobileMenu}
          onGoHome={goHome}
          onStartFiling={startFilingNav}
          onOpenLawLibrary={openLawLibraryNav}
          onOpenLawLibraryCategory={openLawLibraryCategoryNav}
          onOpenCaseLawSearch={openCaseLawSearchNav}
          onOpenCourtFeeCalculator={openCourtFeeCalculatorNav}
          onOpenTranslateDocument={openTranslateDocumentNav}
          onOpenCauseListBasic={openCauseListBasicNav}
          onOpenCauseListPro={openCauseListProNav}
          onOpenAbout={openAboutNav}
          onOpenContact={openContactNav}
          onOpenSettings={openSettingsNav}
          onOpenLogin={openLoginNav}
          onOpenMyCases={openMyCasesNav}
          onOpenPricing={openPricingNav}
          onOpenBilling={openBillingNav}
        />
        <main className="app-content">{renderScreen()}</main>
      </div>
      <DictationControl />
    </div>
  );
}
