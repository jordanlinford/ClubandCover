import { Route, Switch } from 'wouter';
import { RoleSelectionPage } from './pages/auth/RoleSelection';
import { SignInPage } from './pages/auth/SignIn';
import { SignUpPage } from './pages/auth/SignUp';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import { ProfilePage } from './pages/Profile';
import { BooksListPage } from './pages/books/BooksList';
import { BookDetailPage } from './pages/books/BookDetail';
import { BookFormPage } from './pages/books/BookForm';
import { ClubsListPage } from './pages/clubs/ClubsList';
import { ClubDetailPage } from './pages/clubs/ClubDetail';
import { ClubFormPage } from './pages/clubs/ClubForm';
import { ClubRoomPage } from './pages/clubs/ClubRoom';
import { PitchBrowserPage } from './pages/clubs/PitchBrowser';
import { CreatePollPage } from './pages/clubs/CreatePoll';
import { HostConsolePage } from './pages/clubs/HostConsole';
import { VotePage } from './pages/clubs/Vote';
import ClubInvitePage from './pages/clubs/ClubInvite';
import { PitchesListPage } from './pages/pitches/List';
import { NewPitchPage } from './pages/pitches/New';
import { PitchDetailPage } from './pages/pitches/Detail';
import { SwapsPage } from './pages/Swaps';
import { BillingPage } from './pages/Billing';
import { LandingPage } from './pages/Landing';
import { NotFoundPage } from './pages/NotFound';
import MessageList from './pages/messages/MessageList';
import MessageThread from './pages/messages/MessageThread';
import ModerationQueue from './pages/admin/ModerationQueue';
import AdminDashboard from './pages/admin/Dashboard';
import ReferralDashboard from './pages/ReferralDashboard';
import DiscoverPage from './pages/Discover';
import OnboardingPage from './pages/Onboarding';
import AuthorAnalyticsPage from './pages/analytics/AuthorAnalytics';
import AuthorDashboard from './pages/AuthorDashboard';
import AuthorDirectory from './pages/AuthorDirectory';
import { RewardsPage } from './pages/Rewards';
import { AdminRewardsPage } from './pages/admin/AdminRewards';
import { SettingsPage } from './pages/Settings';
import AuthorVerification from './pages/AuthorVerification';
import AdminAuthorVerifications from './pages/admin/AuthorVerifications';
import { AchievementsPage } from './pages/Achievements';
import { PublicProfilePage } from './pages/PublicProfile';
import { PublicAuthorProfilePage } from './pages/PublicAuthorProfile';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/author-dashboard" component={AuthorDashboard} />
      <Route path="/auth/role" component={RoleSelectionPage} />
      <Route path="/auth/sign-in" component={SignInPage} />
      <Route path="/auth/sign-up" component={SignUpPage} />
      <Route path="/auth/signin" component={SignInPage} />
      <Route path="/auth/signup" component={SignUpPage} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/users/:userId/profile" component={PublicProfilePage} />
      <Route path="/authors/:userId" component={PublicAuthorProfilePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/books" component={BooksListPage} />
      <Route path="/books/new" component={BookFormPage} />
      <Route path="/books/:id" component={BookDetailPage} />
      <Route path="/books/:id/edit" component={BookFormPage} />
      <Route path="/clubs" component={ClubsListPage} />
      <Route path="/clubs/new" component={ClubFormPage} />
      <Route path="/clubs/invite/:code" component={ClubInvitePage} />
      <Route path="/clubs/:id/room" component={ClubRoomPage} />
      <Route path="/clubs/:id/pitches" component={PitchBrowserPage} />
      <Route path="/clubs/:id/create-poll" component={CreatePollPage} />
      <Route path="/clubs/:id/host-console" component={HostConsolePage} />
      <Route path="/clubs/:clubId/polls/:pollId" component={VotePage} />
      <Route path="/clubs/:id" component={ClubDetailPage} />
      <Route path="/pitches" component={PitchesListPage} />
      <Route path="/pitches/new" component={NewPitchPage} />
      <Route path="/pitches/:id" component={PitchDetailPage} />
      <Route path="/swaps" component={SwapsPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/messages" component={MessageList} />
      <Route path="/messages/:id" component={MessageThread} />
      <Route path="/rewards" component={RewardsPage} />
      <Route path="/achievements" component={AchievementsPage} />
      <Route path="/author-verification" component={AuthorVerification} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/moderation" component={ModerationQueue} />
      <Route path="/admin/rewards" component={AdminRewardsPage} />
      <Route path="/admin/author-verifications" component={AdminAuthorVerifications} />
      <Route path="/referrals" component={ReferralDashboard} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/authors" component={AuthorDirectory} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/analytics/author" component={AuthorAnalyticsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
